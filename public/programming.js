function escapeProgrammingText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderProgrammingList(items, className = '') {
  return `<ul${className ? ` class="${className}"` : ''}>${items.map(item => `<li>${escapeProgrammingText(item)}</li>`).join('')}</ul>`;
}

function presentationPrompt(index, field) {
  return t(`coverage.presentPrompt${index + 1}`, field);
}

function programmingTrackText(track, field) {
  const prefix = ({ python: 'python', javascript: 'js', java: 'java', c: 'c', cpp: 'cpp', csharp: 'csharp', go: 'go', rust: 'rust', typescript: 'ts', php: 'php', html: 'html', css: 'css', sql: 'sql' })[track.id];
  const suffix = ({ beginner: 'Beginner', description: 'Desc', project: 'Project', projectSummary: 'ProjectSummary' })[field];
  if (!prefix || !suffix) return track[field];
  const key = `coverage.${prefix}${suffix}`;
  return t(key, track[field]);
}

function renderLessonContent(track, module, lesson, moduleIndex) {
  const id = `studio-${track.id}-practice-${moduleIndex + 1}`;
  return `
    <article class="programming-lesson" aria-labelledby="${id}-title">
      <p class="programming-lesson-stage">${escapeProgrammingText(t('coverage.lessonStageLabel', 'LESSON {number} / {language}', { number: String(moduleIndex + 1).padStart(2, '0'), language: track.language }))}</p>
      <h4 id="${id}-title">${escapeProgrammingText(lesson.title)}</h4>
      <section class="programming-lesson-section programming-objective"><h5>${escapeProgrammingText(t('ui.objective', 'Objective'))}</h5><p>${escapeProgrammingText(lesson.objective)}</p></section>
      <section class="programming-lesson-section"><h5>${escapeProgrammingText(t('ui.story', 'Story'))}</h5><p>${escapeProgrammingText(lesson.story)}</p></section>
      <section class="programming-lesson-section"><h5>${escapeProgrammingText(t('ui.discovery', 'Discovery'))}</h5><p>${escapeProgrammingText(lesson.discovery)}</p></section>
      <section class="programming-lesson-section"><h5>${escapeProgrammingText(t('ui.concept', 'Concept'))}</h5><p>${escapeProgrammingText(lesson.concept)}</p></section>
      <section class="programming-code-example" aria-label="${escapeProgrammingText(t('coverage.languageCodeAria', '{language} code example', { language: track.language }))}">
        <div><h5>${escapeProgrammingText(t('ui.example', 'Example'))} / ${escapeProgrammingText(track.language)}</h5><button type="button" class="programming-copy-button" data-copy-draft="${id}">${escapeProgrammingText(t('coverage.copyDraft', 'Copy draft'))}</button></div>
        <pre><code>${escapeProgrammingText(lesson.example)}</code></pre>
      </section>
      <section class="programming-practice" id="${id}">
        <div class="programming-lesson-section"><h5>${escapeProgrammingText(t('common.practice', 'Practice'))}</h5><p>${escapeProgrammingText(lesson.practice)}</p></div>
        <label for="${id}-draft">${escapeProgrammingText(t('coverage.editableDraft', 'Your editable {language} draft', { language: track.language }))}</label>
        <textarea id="${id}-draft" class="programming-practice-editor" data-practice-editor spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off">${escapeProgrammingText(lesson.example)}</textarea>
        <p class="programming-practice-note">${t('coverage.practiceRuntimeNote', 'Edit the starter code and try the task in your own environment. This page does not execute or save code; your draft lasts only until this page is refreshed.')}</p>
      </section>
      <section class="programming-lesson-section programming-challenge"><h5>${escapeProgrammingText(t('ui.challenge', 'Challenge'))}</h5><p>${escapeProgrammingText(lesson.challenge)}</p></section>
      <section class="programming-lesson-section programming-takeaway"><h5>${escapeProgrammingText(t('ui.takeaway', 'Takeaway'))}</h5><p>${escapeProgrammingText(lesson.takeaway)}</p></section>
    </article>`;
}

function renderTrackStages(track, baseId) {
  const stages = [
    { label: t('ui.learn', 'Learn'), href: `${baseId}-module-1` },
    { label: t('ui.understand', 'Understand'), href: `${baseId}-module-2` },
    { label: t('common.practice', 'Practice'), href: `${baseId}-practice-1` },
    { label: t('ui.solve', 'Solve'), href: `${baseId}-challenges` },
    { label: t('ui.build', 'Build'), href: `${baseId}-project` },
    { label: t('ui.present', 'Present'), href: `${baseId}-presentation` }
  ];
  return `<nav class="programming-stage-nav" aria-label="${escapeProgrammingText(track.language)} ${escapeProgrammingText(t('coverage.learningStages','learning stages'))}">
    ${stages.map((stage, index) => `<a href="#${stage.href}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeProgrammingText(stage.label)}</a>`).join('')}
  </nav>`;
}

function renderTrackModules(track, content, baseId) {
  return `<section class="programming-modules" aria-labelledby="${baseId}-modules-title">
    <div class="programming-subsection-heading"><p class="programming-eyebrow">${escapeProgrammingText(t('coverage.learnTheLanguage', 'Learn the language'))}</p><h3 id="${baseId}-modules-title">${escapeProgrammingText(t('coverage.trackLessons', 'Your {language} lessons', { language: track.language }))}</h3><p>${escapeProgrammingText(t('coverage.projectLearnSentence', 'Each lesson connects an idea to code you can inspect and change.'))}</p></div>
    ${track.modules.map((module, moduleIndex) => {
      const lesson = content.lessons[moduleIndex];
      const moduleId = `${baseId}-module-${moduleIndex + 1}`;
      return `<details class="programming-module" id="${moduleId}"${moduleIndex === 0 ? ' open' : ''}>
        <summary><span class="programming-module-number">${String(moduleIndex + 1).padStart(2, '0')}</span><span><strong>${escapeProgrammingText(module.title)}</strong><small>${escapeProgrammingText(lesson.title)}</small></span><span class="programming-module-toggle" aria-hidden="true">+</span></summary>
        <div class="programming-module-body">
          <p class="programming-module-topics"><strong>${escapeProgrammingText(t('coverage.inThisModule', 'In this module:'))}</strong> ${escapeProgrammingText(module.topics.join(' · '))}</p>
          ${renderLessonContent(track, module, lesson, moduleIndex)}
        </div>
      </details>`;
    }).join('')}
  </section>`;
}

function renderChallengeBoard(track, content, baseId) {
  return `<section class="programming-challenge-board" id="${baseId}-challenges" aria-labelledby="${baseId}-challenge-title">
    <p class="programming-eyebrow">${escapeProgrammingText(t('coverage.solveWithWhatYouKnow', 'Solve with what you know'))}</p>
    <h3 id="${baseId}-challenge-title">${escapeProgrammingText(t('coverage.challengeSet', '{language} challenge set', { language: track.language }))}</h3>
    <p>${t('coverage.challengeRuntime', 'Try each task in your own runtime. The challenge asks you to change code or make a design decision; it does not mark or save completion.')}</p>
    <ol>${content.lessons.map((lesson, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeProgrammingText(lesson.title)}</strong><p>${escapeProgrammingText(lesson.challenge)}</p></div></li>`).join('')}</ol>
    <aside class="programming-mini-build"><p class="programming-eyebrow">${escapeProgrammingText(t('coverage.miniBuild', 'Mini-build'))}</p><p>${escapeProgrammingText(track.miniBuild)}</p></aside>
  </section>`;
}

function renderProject(track, content, config, baseId) {
  const plan = content.project;
  return `<section class="programming-project-brief" id="${baseId}-project" aria-labelledby="${baseId}-project-title">
    <div class="programming-project-copy"><p class="programming-eyebrow">${escapeProgrammingText(t('coverage.buildSomething', 'Build something real'))}</p><h3 id="${baseId}-project-title">${escapeProgrammingText(programmingTrackText(track, 'project'))}</h3><p class="programming-project-summary">${escapeProgrammingText(programmingTrackText(track, 'projectSummary'))}</p>
      <dl class="programming-project-context"><div><dt>${escapeProgrammingText(t('ui.for', 'For'))}</dt><dd>${escapeProgrammingText(plan.user)}</dd></div><div><dt>${escapeProgrammingText(t('ui.problem', 'Problem'))}</dt><dd>${escapeProgrammingText(plan.problem)}</dd></div><div><dt>${escapeProgrammingText(t('ui.design', 'Design'))}</dt><dd>${escapeProgrammingText(plan.architecture)}</dd></div></dl>
    </div>
    <div class="programming-project-work"><h4>${escapeProgrammingText(t('ui.projectRequirements', 'Project requirements'))}</h4>${renderProgrammingList(plan.requirements, 'programming-project-requirements')}<h4>${escapeProgrammingText(t('ui.testIt', 'How to test it'))}</h4><p>${escapeProgrammingText(plan.tests)}</p><ol class="programming-project-milestones">${config.projectMilestones.map((milestone, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${escapeProgrammingText(milestone)}</li>`).join('')}</ol></div>
  </section>`;
}

function renderPresentation(track, config, baseId) {
  return `<section class="programming-project-presentation" id="${baseId}-presentation" aria-labelledby="${baseId}-presentation-title">
    <div><p class="programming-eyebrow">${escapeProgrammingText(t('coverage.makeThinkingVisible', 'Make your thinking visible'))}</p><h3 id="${baseId}-presentation-title">${escapeProgrammingText(t('coverage.presentLanguageProject', 'Present your {language} project', { language: track.language }))}</h3><p>${escapeProgrammingText(t('coverage.presentationUseGuide', 'Use this guide to explain your decisions and demonstrate a real result. Programming Studio does not collect or score project submissions.'))}</p><span class="programming-presentation-count">${escapeProgrammingText(t('coverage.presentationPrompts', '{count} prompts / YOUR DEMO GUIDE', { count: config.presentationFields.length }))}</span></div>
    <ol>${config.presentationFields.map((field, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeProgrammingText(presentationPrompt(index, field))}</p></li>`).join('')}</ol>
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
    <summary aria-label="${escapeProgrammingText(t('coverage.languageJourneyAria', 'Explore the {language} learning journey', { language: track.language }))}">
      <span class="programming-track-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="programming-track-name-wrap"><span class="programming-track-family">${escapeProgrammingText(track.family)}</span><span class="programming-track-name">${escapeProgrammingText(track.language)}</span></span>
      <span class="programming-track-description">${escapeProgrammingText(programmingTrackText(track, 'description'))}</span>
      <span class="programming-track-level"><strong>${escapeProgrammingText(t(track.id === 'html' || track.id === 'css' ? 'coverage.foundationLevel' : 'coverage.beginnerIntermediateLevel', track.level))}</strong><small>${escapeProgrammingText(programmingTrackText(track, 'beginner'))}</small></span>
      <span class="programming-track-cta">${escapeProgrammingText(t('coverage.openLessons', 'Open lessons'))} <span aria-hidden="true">+</span></span>
    </summary>
    <div class="programming-track-detail">
      <div class="programming-track-overview"><p class="programming-eyebrow">${escapeProgrammingText(t('coverage.whatYouWillDo', 'What you will be able to do'))}</p>${renderProgrammingList(track.objectives, 'programming-objectives')}</div>
      ${renderTrackStages(track, baseId)}
      ${renderTrackModules(track, content, baseId)}
      ${renderChallengeBoard(track, content, baseId)}
      ${renderProject(track, content, config, baseId)}
      ${renderPresentation(track, config, baseId)}
      <section class="programming-progress-empty" aria-label="${t('coverage.studioProgressAria', 'Progress status')}" data-i18n-aria-label="coverage.studioProgressAria"><p class="programming-eyebrow">${t('coverage.yourProgress', 'YOUR PROGRESS')}</p><h4>${t('coverage.completionNotPersisted', 'Completion is not persisted.')}</h4><p>${t('coverage.noStudioProgressSaved', 'No lessons, challenges, project milestones, or presentations are marked complete or saved by this Studio.')}</p></section>
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
      <li><span>${String(index + 1).padStart(2, '0')}</span>${escapeProgrammingText(presentationPrompt(index, field))}</li>`).join('');
  }

  if (container.dataset.handlersBound !== 'true') {
    container.dataset.handlersBound = 'true';
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
        button.textContent = t('coverage.copied', 'Copied');
        window.setTimeout(() => { button.textContent = original; }, 1400);
      } catch (_error) {
        editor.focus();
        editor.select();
        button.textContent = t('coverage.selectCopy', 'Select and copy');
      }
    });
  }
}

(async function initializeProgrammingStudio() {
  if (!/\/programming(?:\.html)?\/?$/i.test(window.location.pathname)) return;
  const authReady = window.careerPathAuthReady || Promise.resolve(null);
  const accessToken = await authReady;
  if (!accessToken) return;
  renderProgrammingStudio();
  document.addEventListener('careerpath:language-change', renderProgrammingStudio);
})();
