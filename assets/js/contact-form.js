(function () {
  'use strict';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const RULES = {
    name: function (v) { return v.trim().length > 0 ? '' : 'Please enter your name.'; },
    email: function (v) { return emailRegex.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    subject: function (v) { return v.trim().length > 0 ? '' : 'Please add a subject.'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Say a little more, at least 10 characters.'; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const successPanel = document.getElementById('formSuccess');
    const resetBtn = document.getElementById('formResetBtn');

    Object.keys(RULES).forEach(function (fieldName) {
      const field = form.querySelector('[name="' + fieldName + '"]');
      if (!field) return;
      field.addEventListener('blur', function () { validateField(form, fieldName); });
      field.addEventListener('input', function () {
        const group = field.closest('.form-group');
        if (group && group.classList.contains('has-error')) validateField(form, fieldName);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      let hasError = false;
      Object.keys(RULES).forEach(function (fieldName) {
        if (!validateField(form, fieldName)) hasError = true;
      });

      if (hasError) {
        window.showToast('Please fix the highlighted fields.', 'error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      const data = new FormData(form);

      fetch(form.action, {
        method: form.method || 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            showSuccess();
          } else {
            return response.json().then(function (payload) {
              const detail = payload && payload.errors && payload.errors.length
                ? payload.errors.map(function (err) { return err.message; }).join(', ')
                : 'Something went wrong. Please try again or email me directly.';
              throw new Error(detail);
            });
          }
        })
        .catch(function (err) {
          window.showToast(err.message || 'Could not send message. Please try again.', 'error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
        });
    });

    function showSuccess() {
      form.style.display = 'none';
      if (successPanel) successPanel.classList.add('visible');
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        form.querySelectorAll('.form-group').forEach(function (group) {
          group.classList.remove('has-error', 'is-valid');
        });
        if (successPanel) successPanel.classList.remove('visible');
        form.style.display = '';
      });
    }
  });

  function validateField(form, fieldName) {
    const field = form.querySelector('[name="' + fieldName + '"]');
    const rule = RULES[fieldName];
    if (!field || !rule) return true;
    const group = field.closest('.form-group');
    if (!group) return true;

    const message = rule(field.value || '');
    if (message) {
      group.classList.add('has-error');
      group.classList.remove('is-valid');
      const errorText = group.querySelector('.error-text');
      if (errorText) errorText.textContent = message;
      return false;
    }

    group.classList.remove('has-error');
    group.classList.add('is-valid');
    return true;
  }
})();
