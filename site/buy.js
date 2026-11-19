// The "Pay ₦5,000 with Paystack" form: asks the licence server to start a
// Paystack payment, then goes to Paystack's page.
(function () {
  var form = document.getElementById('buy-form');
  if (!form) return;
  var message = document.getElementById('buy-message');
  var server = (window.HORDEDESK_LICENCE_SERVER || '').replace(/\/$/, '');
  var button = form.querySelector('button');
  if (!server) {
    button.disabled = true;
    message.textContent = 'Online payment opens soon.';
    return;
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    button.disabled = true;
    message.textContent = 'Opening Paystack...';
    fetch(server + '/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: form.shop.value, email: form.email.value }),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (res.ok && res.data.url) {
          window.location.href = res.data.url;
        } else {
          message.textContent = res.data.message || 'Payment could not start. Try again.';
          button.disabled = false;
        }
      })
      .catch(function () {
        message.textContent = 'Could not reach the payment server. Check your connection and try again.';
        button.disabled = false;
      });
  });
})();
