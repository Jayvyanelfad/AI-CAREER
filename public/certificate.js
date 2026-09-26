(function () {
  const state = document.getElementById('certificate-state');
  const stateMessage = document.getElementById('certificate-state-message');
  const lookupForm = document.getElementById('certificate-lookup');
  const lookupInput = document.getElementById('certificate-lookup-id');
  const paper = document.getElementById('certificate-paper');
  const actions = document.getElementById('certificate-actions');
  const pageTitle = document.getElementById('page-title');
  const pageDescription = document.getElementById('page-description');

  async function getCertificate(id, isPublic) {
    const path = isPublic
      ? `/api/certificate/verify/${encodeURIComponent(id)}`
      : `/api/certificate/id/${encodeURIComponent(id)}`;
    const headers = {};
    if (!isPublic) {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in to view this certificate.');
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(path, { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Certificate not found.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showState(message, allowLookup = false) {
    paper.hidden = true;
    actions.hidden = true;
    state.hidden = false;
    stateMessage.textContent = message;
    lookupForm.hidden = !allowLookup;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date)
      : 'Date unavailable';
  }

  function render(certificate, isPublic) {
    state.hidden = true;
    paper.hidden = false;
    actions.hidden = false;
    pageTitle.textContent = isPublic ? 'Certificate verification' : 'Your certificate';
    pageDescription.textContent = isPublic
      ? 'Public verification of an issued CareerPath AI certificate.'
      : 'A verified record of your course learning and final assessment.';
    document.getElementById('certificate-kicker').textContent = isPublic ? 'Verified Certificate' : 'Certificate of Achievement';
    document.getElementById('certificate-learner').textContent = certificate.learnerName || 'CareerPath AI Learner';
    document.getElementById('certificate-course').textContent = certificate.courseTitle || 'Course';
    document.getElementById('certificate-id').textContent = certificate.certificateId;
    document.getElementById('certificate-issued').textContent = formatDate(certificate.issuedAt);
    document.getElementById('certificate-verification-status').textContent = certificate.valid ? 'Valid · Issued' : 'Issued';

    const verifyLink = document.createElement('a');
    verifyLink.href = `certificate.html?verify=${encodeURIComponent(certificate.certificateId)}`;
    verifyLink.textContent = 'Open public verification';
    verifyLink.rel = 'noopener';
    const verifyCell = document.getElementById('certificate-verification-link');
    verifyCell.replaceChildren(verifyLink);
    document.getElementById('certificate-print').onclick = () => window.print();
  }

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    const privateId = params.get('certificateId');
    const legacyCourseId = params.get('courseId');
    const id = verifyId || privateId;
    const isPublic = Boolean(verifyId);

    lookupForm.addEventListener('submit', event => {
      event.preventDefault();
      const enteredId = lookupInput.value.trim();
      if (!enteredId) return;
      window.location.href = `certificate.html?verify=${encodeURIComponent(enteredId)}`;
    });

    if (!id && !legacyCourseId) {
      showState('Enter a certificate ID to verify an issued CareerPath AI certificate.', true);
      return;
    }

    try {
      let certificate;
      if (legacyCourseId && !id) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please log in to view this certificate.');
        const response = await fetch(`/api/certificate/${encodeURIComponent(legacyCourseId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        certificate = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(certificate.error || 'Certificate not found.');
      } else {
        certificate = await getCertificate(id, isPublic);
      }
      render(certificate, isPublic);
    } catch (error) {
      const message = error.status === 401
        ? 'Please log in to view your private certificate.'
        : (error.message || 'This certificate could not be verified.');
      showState(message, true);
    }
  }

  document.addEventListener('DOMContentLoaded', load, { once: true });
})();
