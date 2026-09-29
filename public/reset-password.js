(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('reset-password-form');
    const status = document.getElementById('reset-status');
    const loginLink = document.getElementById('reset-login-link');
    const submit = document.getElementById('reset-password-submit');

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error('No active recovery session');
      status.textContent = t('coverage.resetEnterBoth', 'Enter and confirm your new password.');
      form.hidden = false;
    } catch (_error) {
      status.textContent = t('coverage.resetLinkInvalid', 'This password reset link is invalid or has expired. Request a new one from the login page.');
      loginLink.hidden = false;
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const password = document.getElementById('new-password').value;
      const confirmation = document.getElementById('confirm-new-password').value;
      if (password.length < 6) {
        status.textContent = t('coverage.resetShortPassword', 'Use a password with at least 6 characters.');
        return;
      }
      if (password !== confirmation) {
        status.textContent = t('coverage.passwordMismatch', 'The passwords do not match.');
        return;
      }

      submit.disabled = true;
      status.textContent = t('coverage.updatingPassword', 'Updating your password…');
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        form.hidden = true;
        status.textContent = t('coverage.passwordUpdated', 'Your password has been updated. You can now sign in.');
        loginLink.hidden = false;
      } catch (_error) {
        status.textContent = t('coverage.passwordUpdateFailed', 'We could not update your password. Request a new reset link and try again.');
      } finally {
        submit.disabled = false;
      }
    });
  });
})();
