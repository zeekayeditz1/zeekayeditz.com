"use strict";
document.addEventListener("DOMContentLoaded", function () {

  // Preloader
  setTimeout(function () {
    var pre = document.getElementById("preloader");
    if (pre) { pre.style.transition="opacity 0.4s"; pre.style.opacity="0"; setTimeout(function(){ pre.style.display="none"; },400); }
  }, 800);

  // AOS
  if (typeof AOS !== "undefined") { AOS.init({ once:true, easing:"ease-in-out", duration:800 }); }

  // Scroll to top
  var ScrollTop = document.querySelector(".scrollToTop");
  if (ScrollTop) {
    ScrollTop.addEventListener("click", function(){ window.scrollTo({top:0,behavior:"smooth"}); });
    window.addEventListener("scroll", function(){ ScrollTop.classList.toggle("active", window.scrollY>600); });
  }

  // Dark/Light theme
  function setTheme(t) {
    localStorage.setItem("theme",t);
    document.documentElement.classList.toggle("dark-theme", t==="dark-theme");
    document.documentElement.classList.toggle("light-theme", t==="light-theme");
  }
  setTheme(localStorage.getItem("theme")||"dark-theme");
  document.querySelectorAll(".mode--toggle").forEach(function(b){
    b.addEventListener("click",function(){ setTheme(localStorage.getItem("theme")==="light-theme"?"dark-theme":"light-theme"); });
  });

  // Sticky header
  var fixedTop=document.querySelector(".one__header");
  function checkSticky(){ if(fixedTop) fixedTop.classList.toggle("header-fixed",window.scrollY>50); }
  checkSticky(); window.addEventListener("scroll",checkSticky);

  // Mobile navbar
  var toggleBtn=document.querySelector(".navbar-toggle-btn");
  var toggleItem=document.querySelector(".navbar-toggle-item");
  if(toggleBtn&&toggleItem){
    toggleBtn.addEventListener("click",function(){ toggleItem.classList.toggle("d-block"); toggleBtn.classList.toggle("open"); });
  }

  // Custom cursor
  var co=document.querySelector(".cursor-outline"), cd=document.querySelector(".cursor-dot");
  if(co&&cd){ document.addEventListener("mousemove",function(e){ co.style.left=cd.style.left=e.clientX+"px"; co.style.top=cd.style.top=e.clientY+"px"; }); }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click",function(e){
      var t=document.querySelector(this.getAttribute("href"));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:"smooth",block:"start"}); if(toggleItem) toggleItem.classList.remove("d-block"); if(toggleBtn) toggleBtn.classList.remove("open"); }
    });
  });

  // Swiper
  if(typeof Swiper!=="undefined"){
    if(document.querySelector(".portfolio-swiper")) new Swiper(".portfolio-swiper",{slidesPerView:1,spaceBetween:24,loop:true,autoplay:{delay:3000},pagination:{el:".swiper-pagination",clickable:true},breakpoints:{768:{slidesPerView:2},1200:{slidesPerView:3}}});
    if(document.querySelector(".ticker-swiper")) new Swiper(".ticker-swiper",{slidesPerView:"auto",spaceBetween:0,loop:true,speed:4000,autoplay:{delay:0,disableOnInteraction:false},allowTouchMove:false});
  }

  // Magnific popup
  if(typeof jQuery!=="undefined"&&jQuery.fn.magnificPopup){
    jQuery(".popup-video").magnificPopup({type:"iframe"});
    jQuery(".popup_img").magnificPopup({type:"image",gallery:{enabled:true}});
  }

  // Typewriter
  var typeEl=document.getElementById("typewriter");
  if(typeEl){
    var words=["Motion Designer","Video Editor","Content Creator","After Effects Artist"],wi=0,ci=0,del=false;
    function type(){
      var w=words[wi];
      typeEl.textContent=del?w.substring(0,ci-1):w.substring(0,ci+1);
      ci=del?ci-1:ci+1;
      var delay=del?60:100;
      if(!del&&ci===w.length){delay=1800;del=true;}
      else if(del&&ci===0){del=false;wi=(wi+1)%words.length;delay=300;}
      setTimeout(type,delay);
    }
    type();
  }

  // Portfolio filter
  document.querySelectorAll(".filter-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".filter-btn").forEach(function(b){b.classList.remove("active");});
      btn.classList.add("active");
      var f=btn.getAttribute("data-filter");
      document.querySelectorAll(".portfolio-item").forEach(function(item){
        item.style.display=(f==="all"||item.classList.contains(f))?"":"none";
      });
    });
  });

  // Counter animation
  var triggered=false;
  function animateCounters(){
    if(triggered)return; triggered=true;
    document.querySelectorAll("[data-count]").forEach(function(el){
      var target=parseInt(el.getAttribute("data-count"),10),cur=0;
      var step=Math.ceil(target/60);
      var interval=setInterval(function(){
        cur=Math.min(cur+step,target);
        el.textContent=cur+(el.getAttribute("data-suffix")||"");
        if(cur>=target) clearInterval(interval);
      },30);
    });
  }
  var statsSection=document.querySelector(".counters-section");
  if(statsSection){
    new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)animateCounters();});},{threshold:0.3}).observe(statsSection);
  }

  // Contact form
  var form=document.getElementById("contact-form");
  if(form){
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var btn=form.querySelector("button[type=submit]"),msg=document.getElementById("form-message");
      btn.disabled=true; btn.innerHTML='<span>Sending...</span>';
      fetch(form.action,{method:"POST",body:new FormData(form),headers:{"Accept":"application/json"}})
      .then(function(r){
        msg.style.display="block";
        if(r.ok){msg.className="form-msg success";msg.textContent="Message sent! I'll get back to you soon.";form.reset();}
        else{msg.className="form-msg error";msg.textContent="Something went wrong. Please try again.";}
        btn.disabled=false;btn.innerHTML='<span>Send Message</span>';
      }).catch(function(){ msg.style.display="block";msg.className="form-msg error";msg.textContent="Network error. Please try again.";btn.disabled=false;btn.innerHTML='<span>Send Message</span>'; });
    });
  }

});
