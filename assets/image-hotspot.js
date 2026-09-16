(function () {
  var dots = document.querySelectorAll('.hs-dot');

  dots.forEach(function (dot) {
    var popup = dot.querySelector('.hs-popup');
    if (!popup) return;

    var pos = dot.dataset.pos || 'top';
    popup.setAttribute('data-pos', pos);

    dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        popup.classList.toggle('active');
      }
    });

    dot.addEventListener('mouseleave', function () {
      if (!dot.matches(':focus-within')) {
        popup.classList.remove('active');
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.hs-popup.active').forEach(function (p) {
        p.classList.remove('active');
      });
    }
  });
})();
//on click to open popup tooltip
// (function () {
//   var dots = document.querySelectorAll('.hs-dot');
//   var active = null;

//   dots.forEach(function (dot) {
//     var popup = dot.querySelector('.hs-popup');
//     if (!popup) return;
//     var pos = dot.dataset.pos || 'top';
//     popup.setAttribute('data-pos', pos);

//     dot.addEventListener('click', function (e) {
//       e.stopPropagation();
//       if (active && active !== popup) active.classList.remove('active');
//       popup.classList.toggle('active');
//       active = popup.classList.contains('active') ? popup : null;
//     });
//   });

//   document.addEventListener('click', function () {
//     if (active) { active.classList.remove('active'); active = null; }
//   });
// })();