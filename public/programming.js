function escapeProgrammingText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderProgrammingList(items, className = '') {
  return `<ul${className ? ` class="${className}"` : ''}>${items.map(item => `<li>${escapeProgrammingText(item)}</li>`).join('')}</ul>`;
}

function renderLessonContent(track, module, lesson, moduleIndex) {
  const id = `studio-${track.id}-practice-${moduleIndex + 1}`;
  return `
    <article class="programming-lesson" aria-labelledby="${id}-title">
      <p class="programming-lesson-stage">LESSON ${String(moduleIndex + 1).padStart(2, '0')} / ${escapeProgrammingText(track.language)}</p>
      <h4 id="${id}-title">${escapeProgrammingText(lesson.title)}</h4>
      <section class="programming-lesson-section programming-objective"><h5>Objective</h5><p>${escapeProgrammingText(lesson.objective)}</p></section>
      <section class="programming-lesson-section"><h5>Story</h5><p>${escapeProgrammingText(lesson.story)}</p></section>
      <section class="programming-lesson-section"><h5>Discovery</h5><p>${escapeProgrammingText(lesson.discovery)}</p></section>
      <section class="programming-lesson-section"><h5>Concept</h5><p>${escapeProgrammingText(lesson.concept)}</p></section>
      <section class="programming-code-example" aria-label="${escapeProgrammingText(track.language)} code example">
        <div><h5>Example / ${escapeProgrammingText(track.language)}</h5><button type="button" class="programming-copy-button" data-copy-draft="${id}">Copy draft</button></div>
        <pre><code>${escapeProgrammingText(lesson.example)}</code></pre>
      </section>
      <section class="programming-practice" id="${id}">
        <div class="programming-lesson-section"><h5>Practice</h5><p>${escapeProgrammingText(lesson.practice)}</p></div>
        <label for="${id}-draft">Your editable ${escapeProgrammingText(track.language)} draft</label>
        <textarea id="${id}-draft" class="programming-practice-editor" data-practice-editor spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off">${escapeProgrammingText(lesson.example)}</textarea>
        <p class="programming-practice-note">Edit the starter code and try the task in your own environment. This page does not execute or save code; your draft lasts only until this page is refreshed.</p>
      </section>
      <section class="programming-lesson-section programming-challenge"><h5>Challenge</h5><p>${escapeProgrammingText(lesson.challenge)}</p></section>
      <section class="programming-lesson-section programming-takeaway"><h5>Takeaway</h5><p>${escapeProgrammingText(lesson.takeaway)}</p></section>
    </article>`;
}

function renderTrackStages(track, baseId) {
  const stages = [
    { label: 'Learn', href: `${baseId}-module-1` },
    { label: 'Understand', href: `${baseId}-module-2` },
    { label: 'Practice', href: `${baseId}-practice-1` },
    { label: 'Solve', href: `${baseId}-challenges` },
    { label: 'Build', href: `${baseId}-project` },
    { label: 'Present', href: `${baseId}-presentation` }
  ];
  return `<nav class="programming-stage-nav" aria-label="${escapeProgrammingText(track.language)} learning stages">
    ${stages.map((stage, index) => `<a href="#${stage.href}"><span>${String(index + 1).padStart(2, '0')}</span>${stage.label}</a>`).join('')}
  </nav>`;
}

function renderTrackModules(track, content, baseId) {
  return `<section class="programming-modules" aria-labelledby="${baseId}-modules-title">
    <div class="programming-subsection-heading"><p class="programming-eyebrow">LEARN THE LANGUAGE</p><h3 id="${baseId}-modules-title">Your ${escapeProgrammingText(track.language)} lessons</h3><p>Each lesson connects an idea to code you can inspect and change.</p></div>
    ${track.modules.map((module, moduleIndex) => {
      const lesson = content.lessons[moduleIndex];
      const moduleId = `${baseId}-module-${moduleIndex + 1}`;
      return `<details class="programming-module" id="${moduleId}"${moduleIndex === 0 ? ' open' : ''}>
        <summary><span class="programming-module-number">${String(moduleIndex + 1).padStart(2, '0')}</span><span><strong>${escapeProgrammingText(module.title)}</strong><small>${escapeProgrammingText(lesson.title)}</small></span><span class="programming-module-toggle" aria-hidden="true">+</span></summary>
        <div class="programming-module-body">
          <p class="programming-module-topics"><strong>In this module:</strong> ${escapeProgrammingText(module.topics.join(' · '))}</p>
          ${renderLessonContent(track, module, lesson, moduleIndex)}
        </div>
      </details>`;
    }).join('')}
  </section>`;
}

function renderChallengeBoard(track, content, baseId) {
  return `<section class="programming-challenge-board" id="${baseId}-challenges" aria-labelledby="${baseId}-challenge-title">
    <p class="programming-eyebrow">SOLVE WITH WHAT YOU KNOW</p>
    <h3 id="${baseId}-challenge-title">${escapeProgrammingText(track.language)} challenge set</h3>
    <p>Try each task in your own runtime. The challenge asks you to change code or make a design decision; it does not mark or save completion.</p>
    <ol>${content.lessons.map((lesson, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeProgrammingText(lesson.title)}</strong><p>${escapeProgrammingText(lesson.challenge)}</p></div></li>`).join('')}</ol>
  </section>`;
}

function renderProject(track, content, config, baseId) {
  const plan = content.project;
  return `<section class="programming-project-brief" id="${baseId}-project" aria-labelledby="${baseId}-project-title">
    <div class="programming-project-copy"><p class="programming-eyebrow">BUILD SOMETHING REAL</p><h3 id="${baseId}-project-title">${escapeProgrammingText(track.project)}</h3><p class="programming-project-summary">${escapeProgrammingText(track.projectSummary)}</p>
      <dl class="programming-project-context"><div><dt>For</dt><dd>${escapeProgrammingText(plan.user)}</dd></div><div><dt>Problem</dt><dd>${escapeProgrammingText(plan.problem)}</dd></div><div><dt>Design</dt><dd>${escapeProgrammingText(plan.architecture)}</dd></div></dl>
    </div>
    <div class="programming-project-work"><h4>Project requirements</h4>${renderProgrammingList(plan.requirements, 'programming-project-requirements')}<h4>How to test it</h4><p>${escapeProgrammingText(plan.tests)}</p><ol class="programming-project-milestones">${config.projectMilestones.map((milestone, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${escapeProgrammingText(milestone)}</li>`).join('')}</ol></div>
  </section>`;
}

function renderPresentation(track, config, baseId) {
  return `<section class="programming-project-presentation" id="${baseId}-presentation" aria-labelledby="${baseId}-presentation-title">
    <div><p class="programming-eyebrow">MAKE YOUR THINKING VISIBLE</p><h3 id="${baseId}-presentation-title">Present your ${escapeProgrammingText(track.language)} project</h3><p>Use this guide to explain your decisions and demonstrate a real result. Programming Studio does not collect or score project submissions.</p><span class="programming-presentation-count">${config.presentationFields.length} prompts / YOUR DEMO GUIDE</span></div>
    <ol>${config.presentationFields.map((field, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeProgrammingText(field)}</p></li>`).join('')}</ol>
  </section>`;
}

function renderProgrammingTrack(track, index) {
  const config = window.PROGRAMMING_STUDIO_CONFIG;
  const content = window.PROGRAMMING_STUDIO_LESSONS?.[track.id];
  if (!content || content.lessons.length !== track.modules.length) {
    return `<p class="programming-track-error">${escapeProgrammingText(track.language)} lessons are temporarily unavailable.</p>`;
  }
  const baseId = `programming-${track.id}`;
  return `<details class="programming-track" data-track-id="${escapeProgrammingText(track.id)}">
    <summary aria-label="Explore the ${escapeProgrammingText(track.language)} learning journey">
      <span class="programming-track-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="programming-track-name-wrap"><span class="programming-track-family">${escapeProgrammingText(track.family)}</span><span class="programming-track-name">${escapeProgrammingText(track.language)}</span></span>
      <span class="programming-track-description">${escapeProgrammingText(track.description)}</span>
      <span class="programming-track-level"><strong>${escapeProgrammingText(track.level)}</strong><small>${escapeProgrammingText(track.beginner)}</small></span>
      <span class="programming-track-cta">Open lessons <span aria-hidden="true">+</span></span>
    </summary>
    <div class="programming-track-detail">
      <div class="programming-track-overview"><p class="programming-eyebrow">WHAT YOU WILL BE ABLE TO DO</p>${renderProgrammingList(track.objectives, 'programming-objectives')}</div>
      ${renderTrackStages(track, baseId)}
      ${renderTrackModules(track, content, baseId)}
      ${renderChallengeBoard(track, content, baseId)}
      ${renderProject(track, content, config, baseId)}
      ${renderPresentation(track, config, baseId)}
      <section class="programming-progress-empty" aria-label="Progress status"><p class="programming-eyebrow">YOUR PROGRESS</p><h4>Completion is not persisted.</h4><p>No lessons, challenges, project milestones, or presentations are marked complete or saved by this Studio.</p></section>
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

  container.addEventListener('toggle', event => {
    if (!(event.target instanceof HTMLDetailsElement) || !event.target.classList.contains('programming-track') || !event.target.open) return;
    container.querySelectorAll('.programming-track[open]').forEach(openTrack => {
      if (openTrack !== event.target) openTrack.open = false;
    });
  }, true);

  container.addEventListener('click', async event => {
    const stageLink = event.target.closest('.programming-stage-nav a');
    if (stageLink) {
      const target = document.getElementById(stageLink.hash.slice(1));
      if (target) {
        event.preventDefault();
        const module = target.closest('.programming-module');
        if (module) module.open = true;
        target.scrollIntoView({ block: 'start' });
        window.history.replaceState(null, '', stageLink.hash);
      }
      return;
    }

    const button = event.target.closest('[data-copy-draft]');
    if (!button) return;
    const editor = document.getElementById(`${button.dataset.copyDraft}-draft`);
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.value);
      const original = button.textContent;
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = original; }, 1400);
    } catch (_error) {
      editor.focus();
      editor.select();
      button.textContent = 'Select and copy';
    }
  });
}

(async function initializeProgrammingStudio() {
  if (!/\/programming(?:\.html)?\/?$/i.test(window.location.pathname)) return;
  const authReady = window.careerPathAuthReady || Promise.resolve(null);
  const accessToken = await authReady;
  if (!accessToken) return;
  renderProgrammingStudio();
})();
