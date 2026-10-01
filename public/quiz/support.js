(function () {
  "use strict";

  document.querySelectorAll("[data-medguide-support]").forEach(function (host) {
    host.innerHTML = '<details class="medguide-support">' +
      '<summary>สนับสนุน MedGuide</summary>' +
      '<div class="medguide-support-content">' +
      '<figure class="medguide-support-meme">' +
      '<figcaption>มาอยู่กุฏิเดียวกับเรา</figcaption>' +
      '<img src="assets/support-meme-original.jpg" width="1026" height="1024" ' +
      'alt="มีมภาพกลุ่มคนรอบโต๊ะ มีพระพุทธรูปอยู่ด้านหลัง" ' +
      'loading="lazy" decoding="async">' +
      '</figure>' +
      '<div class="medguide-support-crop">' +
      '<img src="assets/promptpay-original.jpg" width="2048" height="1807" ' +
      'alt="Thai QR Payment และ PromptPay QR สำหรับสนับสนุน MedGuide" ' +
      'loading="lazy" decoding="async">' +
      '</div></div></details>';

    // Keep the native details keyboard controls independent of quiz shortcuts.
    host.addEventListener("keydown", function (event) {
      event.stopPropagation();
    });
  });
})();
