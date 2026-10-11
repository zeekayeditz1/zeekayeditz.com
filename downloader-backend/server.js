'use strict';

/**
 * ZeeKay Video Downloader backend — Node.js, yt-dlp and ffmpeg.
 * Optional YouTube session is supplied only through host-managed secrets.
 */

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { execFile, spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const crypto = require('crypto');

const PORT            = process.env.PORT       || 3001;
const YTDLP_PATH      = process.env.YTDLP_PATH || 'yt-dlp';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s=>s.trim());
const MAX_JOB_AGE_MS  = 60 * 60 * 1000;
const COOKIES_PATH    = path.join(os.tmpdir(), 'zdm_cookies.txt');
let ytdlpVersion = null;

// ── Decode cookies from HF Secret at startup ────────────────────
let HAS_COOKIES = false;
try {
  if (process.env.YT_COOKIES_BASE64) {
    const decoded = Buffer.from(process.env.YT_COOKIES_BASE64, 'base64').toString('utf-8');
    if (decoded.includes('youtube.com') || decoded.includes('# Netscape')) {
      fs.writeFileSync(COOKIES_PATH, decoded, { mode: 0o600 });
      HAS_COOKIES = true;
      console.log('[ZDM] ✓ YouTube cookies loaded from secret');
    } else {
      console.warn('[ZDM] ⚠ YT_COOKIES_BASE64 set but content does not look like a cookies.txt file');
    }
  } else {
    console.log('[ZDM] No YouTube cookies configured; using public video access');
  }
} catch (e) {
  console.error('[ZDM] Cookie decode error:', e.message);
}

// ── yt-dlp base args ────────────────────────────────────────────
function ytdlpArgs(url) {
  const args = ['--js-runtimes', 'node', '--force-ipv4', '--socket-timeout', '15', '--retries', '1', '--extractor-retries', '1'];
  const isYT = /(?:youtube\.com|youtu\.be)/i.test(url);
  if (isYT && HAS_COOKIES) {
    args.push('--cookies', COOKIES_PATH);
  }
  return args;
}

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, cb) => {
    if (ALLOWED_ORIGINS.includes('*') || !origin || ALLOWED_ORIGINS.includes(origin))
      cb(null, true);
    else
      cb(new Error('CORS blocked: ' + origin));
  }
}));
app.use(express.json());

const infoLimiter = rateLimit({ windowMs:60*1000,    max:30, standardHeaders:true, legacyHeaders:false });
const dlLimiter   = rateLimit({ windowMs:10*60*1000, max:8,  standardHeaders:true, legacyHeaders:false });

// ── Jobs ────────────────────────────────────────────────────────
const jobs = new Map();
setInterval(() => {
  const cut = Date.now() - MAX_JOB_AGE_MS;
  for (const [id, job] of jobs) {
    if (job.created < cut) {
      if (job.filePath) try { fs.unlinkSync(job.filePath); } catch {}
      try { job.proc?.kill(); } catch {}
      jobs.delete(id);
    }
  }
}, 30*60*1000);

// ── Helpers ─────────────────────────────────────────────────────
const genId = () => crypto.randomBytes(14).toString('hex');

function fmtDuration(s) {
  if (!s) return '';
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
           : `${m}:${String(sec).padStart(2,'0')}`;
}
function fmtSize(b) {
  if (!b||b<0) return null;
  if (b>=1e9) return `${(b/1e9).toFixed(2)} GB`;
  if (b>=1e6) return `${(b/1e6).toFixed(1)} MB`;
  return `${(b/1e3).toFixed(0)} KB`;
}

function inferError(stderr='', url='', err=null) {
  if (err?.killed || err?.code === 'ETIMEDOUT') {
    return 'The video service did not respond in time. Please retry in a moment.';
  }
  const s = stderr.toLowerCase();
  const isYT = /(?:youtube\.com|youtu\.be)/i.test(url);
  if (s.includes('ssl:') || s.includes('sslerror') || s.includes('connection reset')) {
    return 'The download server could not establish a secure connection to the video service. Please try again shortly.';
  }
  if (s.includes('sign in') || s.includes('confirm you’re not a bot') || s.includes("confirm you're not a bot") || s.includes('not a bot')) {
    return isYT
      ? (HAS_COOKIES
          ? 'YouTube rejected the server session. The owner may need to refresh the configured session.'
          : 'YouTube requires login on cloud servers. Owner needs to upload cookies (see HF Setup guide)')
      : 'Login required for this video';
  }
  if (s.includes('private'))         return 'This video is private';
  if (s.includes('not available'))   return 'Video not available in this region';
  if (s.includes('age'))             return 'Age-restricted video — cookies needed';
  if (s.includes('unsupported url')) return 'Unsupported URL or website';
  if (s.includes('http error 403'))  return 'Access denied (403)';
  if (s.includes('http error 404'))  return 'Video not found (404)';
  return 'Could not fetch video info — check the URL and try again';
}

function buildFormats(info) {
  const all = info.formats || [];
  const result = [];

  const videos = all
    .filter(f => f.vcodec && f.vcodec!=='none' && f.height)
    .sort((a,b)=> b.height!==a.height ? b.height-a.height : (b.fps||0)-(a.fps||0));

  const seen = new Set();
  for (const f of videos) {
    const fps  = f.fps>=48 ? f.fps : null;
    const qKey = `${f.height}p${fps||''}${f.ext}`;
    if (seen.has(qKey)) continue;
    seen.add(qKey);
    const hasAudio = !!(f.acodec && f.acodec!=='none');
    result.push({
      id        : hasAudio ? f.format_id : `${f.format_id}+bestaudio/best`,
      type      : 'video',
      quality   : fps ? `${f.height}p ${fps}fps` : `${f.height}p`,
      height    : f.height,
      ext       : hasAudio ? f.ext : 'mp4',
      filesize  : fmtSize(f.filesize || f.filesize_approx),
      vcodec    : (f.vcodec||'').split('.')[0],
      acodec    : hasAudio ? (f.acodec||'').split('.')[0] : 'merged',
      needsMerge: !hasAudio,
    });
    if (result.filter(x=>x.type==='video').length >= 7) break;
  }

  const audios = all
    .filter(f => (!f.vcodec||f.vcodec==='none') && f.acodec && f.acodec!=='none')
    .sort((a,b)=>(b.abr||0)-(a.abr||0));
  const seenA = new Set();
  for (const f of audios) {
    const abr = Math.round(f.abr||0);
    if (seenA.has(abr)) continue;
    seenA.add(abr);
    result.push({
      id      : f.format_id,
      type    : 'audio',
      quality : abr ? `${abr} kbps` : 'Audio Only',
      ext     : f.ext,
      filesize: fmtSize(f.filesize || f.filesize_approx),
      acodec  : (f.acodec||'').split('.')[0],
      needsMerge: false,
    });
    if (result.filter(x=>x.type==='audio').length >= 3) break;
  }
  return result;
}

// ── Routes ──────────────────────────────────────────────────────
app.get('/health', (_,res)=> res.json({
  ok: true,
  jobs: jobs.size,
  ytdlp: YTDLP_PATH,
  version: ytdlpVersion,
  node: process.version,
  cookies: HAS_COOKIES ? 'loaded' : 'missing'
}));

app.get('/api/info', infoLimiter, (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error:'url param required' });
  try { new URL(url); } catch { return res.status(400).json({ error:'Invalid URL' }); }

  const args = [...ytdlpArgs(url), '--no-playlist', '-J', '--', url];

  execFile(YTDLP_PATH, args, { maxBuffer:30*1024*1024, timeout:60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[ZDM] info err:', err.code, err.killed ? 'timeout' : '', stderr?.slice(-1500));
      return res.status(err.killed ? 504 : 422).json({ error: inferError(stderr, url, err) });
    }
    let info;
    try { info = JSON.parse(stdout); }
    catch { return res.status(500).json({ error:'Failed to parse response' }); }
    res.json({
      title    : info.title,
      thumbnail: info.thumbnail,
      duration : fmtDuration(info.duration),
      uploader : info.uploader || info.channel || '',
      formats  : buildFormats(info),
    });
  });
});

app.post('/api/download/start', dlLimiter, (req, res) => {
  const { url, formatId, title='video', ext='mp4' } = req.body;
  if (!url||!formatId) return res.status(400).json({ error:'url and formatId required' });
  try { new URL(url); } catch { return res.status(400).json({ error:'Invalid URL' }); }

  const jobId     = genId();
  const safeTitle = (title.replace(/[^\w\s\-]/g,'').trim()||'video').slice(0,80);
  const outPath   = path.join(os.tmpdir(), `zdm_${jobId}.%(ext)s`);

  const args = [
    ...ytdlpArgs(url),
    '--no-playlist','--no-warnings',
    '-f', formatId,
    '--merge-output-format', ext,
    '--newline',
    '-o', outPath,
    url,
  ];

  const proc = spawn(YTDLP_PATH, args);
  let stderrTail = '';
  const job  = { status:'starting', progress:0, filePath:null, ext, title:safeTitle,
                 error:null, created:Date.now(), clients:[], proc };
  jobs.set(jobId, job);

  function broadcast(data) {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    for (const c of job.clients) try { c.write(line); } catch {}
    if (data.type==='ready'||data.type==='error') {
      for (const c of job.clients) try { c.end(); } catch {}
      job.clients = [];
    }
  }

  function parseLine(raw) {
    const m = raw.toString().match(/\[download\]\s+([\d.]+)%/);
    if (m) {
      job.progress = parseFloat(m[1]);
      job.status   = 'downloading';
      broadcast({ type:'progress', progress:job.progress });
    }
  }
  proc.stdout.on('data', parseLine);
  proc.stderr.on('data', parseLine);
  proc.stderr.on('data', chunk => { stderrTail = (stderrTail + chunk.toString()).slice(-4000); });

  proc.on('close', code => {
    job.proc = null;
    if (code===0) {
      try {
        const files = fs.readdirSync(os.tmpdir()).filter(f=>f.startsWith(`zdm_${jobId}`));
        if (files.length) {
          files.sort((a,b)=>{ try{return fs.statSync(path.join(os.tmpdir(),b)).size-fs.statSync(path.join(os.tmpdir(),a)).size;}catch{return 0;} });
          job.filePath = path.join(os.tmpdir(), files[0]);
          job.ext      = path.extname(files[0]).slice(1) || ext;
          job.status   = 'ready';
          broadcast({ type:'ready' });
          return;
        }
      } catch(e) { console.error('[ZDM] scan err:', e.message); }
    }
    job.status='error';
    job.error =code!==0 ? inferError(stderrTail, url) : 'Output file not found';
    broadcast({ type:'error', message:job.error });
  });
  proc.on('error', ()=>{ job.status='error'; job.error='yt-dlp not found'; broadcast({type:'error',message:job.error}); });

  res.json({ jobId });
});

app.get('/api/download/progress/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error:'Job not found' });

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.setHeader('X-Accel-Buffering','no');
  res.flushHeaders();

  if (job.status==='ready') { res.write(`data: ${JSON.stringify({type:'ready'})}\n\n`); return res.end(); }
  if (job.status==='error') { res.write(`data: ${JSON.stringify({type:'error',message:job.error})}\n\n`); return res.end(); }

  res.write(`data: ${JSON.stringify({type:'progress',progress:job.progress})}\n\n`);
  job.clients.push(res);

  const ping = setInterval(()=>{ try{res.write(': ping\n\n');}catch{} },15000);
  req.on('close', ()=>{
    clearInterval(ping);
    job.clients = job.clients.filter(c=>c!==res);
    if (job.clients.length===0 && job.status==='downloading') {
      setTimeout(()=>{
        const j=jobs.get(req.params.jobId);
        if(!j||j.clients.length>0||j.status==='ready') return;
        try{j.proc?.kill();}catch{}
        if(j.filePath){try{fs.unlinkSync(j.filePath);}catch{}}
        jobs.delete(req.params.jobId);
      },10000);
    }
  });
});

app.get('/api/download/file/:jobId', (req, res) => {
  const job=jobs.get(req.params.jobId);
  if (!job)                 return res.status(404).send('Not found');
  if (job.status!=='ready') return res.status(409).send(`Not ready (${job.status})`);
  if (!job.filePath||!fs.existsSync(job.filePath)) return res.status(404).send('File missing');

  const MIME={mp4:'video/mp4',webm:'video/webm',mkv:'video/x-matroska',avi:'video/x-msvideo',
               mov:'video/quicktime',mp3:'audio/mpeg',m4a:'audio/mp4',opus:'audio/opus',
               ogg:'audio/ogg',aac:'audio/aac',flac:'audio/flac'};
  const stat=fs.statSync(job.filePath);
  res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(job.title+'.'+job.ext)}`);
  res.setHeader('Content-Type', MIME[job.ext]||'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control','no-store');

  const stream=fs.createReadStream(job.filePath);
  stream.pipe(res);
  stream.on('end', ()=>{ setTimeout(()=>{ try{fs.unlinkSync(job.filePath);}catch{}; jobs.delete(req.params.jobId); },5000); });
  req.on('close', ()=>stream.destroy());
  stream.on('error', err=>{ console.error('[ZDM] stream err:',err.message); if(!res.headersSent) res.status(500).end(); });
});

app.listen(PORT, ()=>{
  console.log(`[ZDM] Running  → http://localhost:${PORT}`);
  console.log(`[ZDM] Origins  : ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`[ZDM] Cookies  : ${HAS_COOKIES ? 'loaded ✓' : 'not configured'}`);
  execFile(YTDLP_PATH,['--version'],{timeout:5000},(err,stdout)=>{
    if(err) console.error('[ZDM] ⚠ yt-dlp not found!');
    else { ytdlpVersion = stdout.trim(); console.log(`[ZDM] yt-dlp   : ${ytdlpVersion}`); }
  });
  // A credential-free connectivity check separates hosting/network failures
  // from extractor or authenticated-session failures in container logs.
  execFile('curl', ['--head', '--silent', '--show-error', '--ipv4', '--max-time', '15', 'https://www.youtube.com'], {timeout:20000}, (err, stdout, stderr) => {
    console.log('[ZDM] YouTube connection:', err ? `curl exit ${err.code}: ${stderr.trim()}` : stdout.split('\n')[0].trim());
  });
});

