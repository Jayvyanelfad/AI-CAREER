function escapeProgrammingText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderProgrammingList(items, className = '') {
  return `<ul${className ? ` class="${className}"` : ''}>${items.map(item => `<li>${escapeProgrammingText(item)}</li>`).join('')}</ul>`;
}

function renderJourneyStages(track) {
  return `<ol class="programming-track-journey">
    ${track.journeyStages.map((stage, index) => `
      <li class="programming-journey-stage programming-journey-stage--${escapeProgrammingText(stage.status)}">
        <span class="programming-stage-number">${String(index + 1).padStart(2, '0')}</span>
        <div><h4>${escapeProgrammingText(stage.title)}</h4>${renderProgrammingList(stage.topics, 'programming-stage-topics')}</div>
      </li>`).join('')}
  </ol>`;
}

function renderProgrammingTrack(track, index) {
  const config = window.PROGRAMMING_STUDIO_CONFIG;
  return `
    <details class="programming-track" data-track-id="${escapeProgrammingText(track.id)}">
      <summary aria-label="Explore the ${escapeProgrammingText(track.language)} learning journey">
        <span class="programming-track-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="programming-track-name-wrap">
          <span class="programming-track-family">${escapeProgrammingText(track.family)}</span>
          <span class="programming-track-name">${escapeProgrammingText(track.language)}</span>
        </span>
        <span class="programming-track-description">${escapeProgrammingText(track.description)}</span>
        <span class="programming-track-level"><strong>${escapeProgrammingText(track.level)}</strong><small>${escapeProgrammingText(track.beginner)}</small></span>
        <span class="programming-track-cta">Explore journey <span aria-hidden="true">+</span></span>
      </summary>
      <div class="programming-track-detail">
        <div class="programming-track-overview">
          <p class="programming-eyebrow">WHAT YOU WILL BE ABLE TO DO</p>
          ${renderProgrammingList(track.objectives, 'programming-objectives')}
        </div>
        <section class="programming-blueprint-section" aria-label="${escapeProgrammingText(track.language)} journey blueprint">
          <div class="programming-blueprint-heading">
            <div><p class="programming-eyebrow">A REUSABLE EIGHT-STAGE JOURNEY</p><h3>Your ${escapeProgrammingText(track.language)} path</h3></div>
            <span class="programming-content-status">BLUEPRINT / LESSONS NOT PUBLISHED</span>
          </div>
          ${renderJourneyStages(track)}
        </section>
        <section class="programming-practice-model" aria-label="${escapeProgrammingText(track.language)} practice model">
          <p class="programming-eyebrow">FROM CONCEPT TO CONFIDENCE</p>
          <div class="programming-practice-grid">
            <article><span>01 / QUICK PRACTICE</span><h4>Try one idea</h4><p>${escapeProgrammingText(track.quickPractice)}</p><small>Example prompt · activity not yet interactive</small></article>
            <article><span>02 / CHALLENGE</span><h4>Combine concepts</h4><p>${escapeProgrammingText(track.challenge)}</p><small>Challenge bank planned</small></article>
            <article><span>03 / MINI-BUILD</span><h4>Make a small tool</h4><p>${escapeProgrammingText(track.miniBuild)}</p><small>Project work area planned</small></article>
          </div>
        </section>
        <section class="programming-final-project" aria-label="${escapeProgrammingText(track.language)} project direction">
          <div class="programming-final-project-copy">
            <p class="programming-eyebrow">FINAL PROJECT DIRECTION</p>
            <h3>${escapeProgrammingText(track.project)}</h3>
            <p>${escapeProgrammingText(track.projectSummary)}</p>
            <span>EXAMPLE DIRECTION · NOT A COMPLETED PROJECT</span>
          </div>
          <ol class="programming-project-milestones" aria-label="Project progression">
            ${config.projectMilestones.map((milestone, milestoneIndex) => `<li><span>${String(milestoneIndex + 1).padStart(2, '0')}</span>${escapeProgrammingText(milestone)}</li>`).join('')}
          </ol>
        </section>
        <div class="programming-track-bottom-grid">
          <section class="programming-specializations">
            <p class="programming-eyebrow">FUTURE SPECIALIZATION BRANCHES</p>
            ${track.specializations.length
              ? renderProgrammingList(track.specializations, 'programming-specialization-list')
              : '<p class="programming-future-note">This track can grow into language-specific branches as its curriculum is developed.</p>'}
            <small>Future directions only · not available as courses yet</small>
          </section>
          <section class="programming-progress-empty" aria-live="polite">
            <p class="programming-eyebrow">YOUR PROGRESS</p>
            <h4>Progress tracking is not available yet.</h4>
            <p>This blueprint does not save lesson, challenge, or project completion.</p>
          </section>
        </div>
      </div>
    </details>`;
}

function renderProgrammingStudio() {
  const config = window.PROGRAMMING_STUDIO_CONFIG;
  const container = document.getElementById('programming-track-list');
  const presentation = document.getElementById('programming-presentation-points');
  if (!config || !container) return;

  container.innerHTML = config.tracks.map(renderProgrammingTrack).join('');
  if (presentation) {
    presentation.innerHTML = config.presentationFields.map((field, index) => `
      <li><span>${String(index + 1).padStart(2, '0')}</span>${escapeProgrammingText(field)}</li>`).join('');
  }

  // Keep the language list scannable when a learner opens one journey.
  container.addEventListener('toggle', event => {
    if (!(event.target instanceof HTMLDetailsElement) || !event.target.open) return;
    container.querySelectorAll('details[open]').forEach(openTrack => {
      if (openTrack !== event.target) openTrack.open = false;
    });
  }, true);
}

(async function initializeProgrammingStudio() {
  if (!/\/programming(?:\.html)?\/?$/i.test(window.location.pathname)) return;
  const authReady = window.careerPathAuthReady || Promise.resolve(null);
  const accessToken = await authReady;
  if (!accessToken) return;
  renderProgrammingStudio();
})();
