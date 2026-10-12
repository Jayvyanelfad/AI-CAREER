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
  const runnableLanguage = track.id === 'python' ? 'python' : (track.id === 'javascript' ? 'javascript' : null);
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
        <textarea id="${id}-draft" class="programming-practice-editor" data-practice-editor data-starter-code="${escapeProgrammingText(lesson.example)}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off">${escapeProgrammingText(lesson.example)}</textarea>
        <div class="programming-code-actions">
          ${runnableLanguage
            ? `<button type="button" class="programming-run-button" data-run-code data-language="${runnableLanguage}" data-target="${id}" data-lesson-id="${escapeProgrammingText(track.id)}-${moduleIndex + 1}">${escapeProgrammingText(t('programming.runCode', 'Run Code'))}</button>`
            : `<span class="programming-coming-soon">${escapeProgrammingText(t('programming.comingSoon', 'Coming soon'))}</span>`}
          <button type="button" class="programming-reset-button" data-reset-code data-target="${id}">${escapeProgrammingText(t('programming.resetCode', 'Reset code'))}</button>
        </div>
        <p class="programming-practice-note">${escapeProgrammingText(t('coverage.practiceRuntimeNote', 'Edit the starter code, then use Run Code to try it in a secure sandbox for Python and JavaScript. Your draft lasts until this page is refreshed.'))}</p>
        ${runnableLanguage ? `
        <label for="${id}-stdin">${escapeProgrammingText(t('programming.stdinLabel', 'Standard input (optional)'))}</label>
        <textarea id="${id}-stdin" class="programming-stdin-editor" data-stdin-editor spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="3"></textarea>
        <section class="programming-output" data-output-panel hidden>
          <div class="programming-output-head">
            <h5>${escapeProgrammingText(t('programming.output', 'Output'))}</h5>
            <span class="programming-output-status" data-output-status role="status" aria-live="polite"></span>
            <button type="button" class="programming-clear-button" data-clear-output data-target="${id}">${escapeProgrammingText(t('programming.clearOutput', 'Clear output'))}</button>
          </div>
          <pre class="programming-output-body" data-output-body tabindex="0"></pre>
        </section>` : ''}
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

function setProgrammingOutput(panel, { state, statusText, body }) {
  panel.hidden = false;
  panel.dataset.state = state;
  const statusEl = panel.querySelector('[data-output-status]');
  const bodyEl = panel.querySelector('[data-output-body]');
  if (statusEl) statusEl.textContent = statusText;
  if (bodyEl) bodyEl.textContent = body;
}

function combineProgrammingStreams(result) {
  let body = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  if (stderr) body += `${body && !body.endsWith('\n') ? '\n' : ''}${stderr}`;
  return body;
}

async function runProgrammingCode(button) {
  const practice = button.closest('.programming-practice');
  if (!practice) return;
  const editor = document.getElementById(`${button.dataset.target}-draft`);
  const stdinEditor = document.getElementById(`${button.dataset.target}-stdin`);
  const panel = practice.querySelector('[data-output-panel]');
  if (!editor || !panel) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = t('programming.running', 'Running…');
  setProgrammingOutput(panel, { state: 'running', statusText: t('programming.running', 'Running…'), body: '' });

  try {
    const token = localStorage.getItem('token') || '';
    const response = await fetch(`${window.API_BASE || '/api'}/programming/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        language: button.dataset.language,
        code: editor.value,
        stdin: stdinEditor ? stdinEditor.value : '',
        lessonId: button.dataset.lessonId
      })
    });
    const payload = await response.json().catch(() => null);

    if (response.status === 401) {
      setProgrammingOutput(panel, { state: 'error', statusText: t('programming.error', 'Error'), body: t('programming.signInToRun', 'Sign in to run code.') });
      return;
    }
    if (response.status === 429) {
      setProgrammingOutput(panel, { state: 'error', statusText: t('programming.error', 'Error'), body: t('programming.tooMany', 'Too many code executions. Please wait a moment and try again.') });
      return;
    }
    if (response.status === 503) {
      setProgrammingOutput(panel, { state: 'error', statusText: t('programming.error', 'Error'), body: t('programming.unavailable', 'Code execution is temporarily unavailable.') });
      return;
    }
    if (!payload || payload.ok !== true || !payload.result) {
      const message = payload && payload.error && payload.error.message
        ? payload.error.message
        : t('programming.failedRequest', 'Code execution failed. Please try again later.');
      setProgrammingOutput(panel, { state: 'error', statusText: t('programming.error', 'Error'), body: message });
      return;
    }

    const result = payload.result;
    if (result.timedOut) {
      setProgrammingOutput(panel, {
        state: 'timeout',
        statusText: t('programming.timedOut', 'Execution timed out.'),
        body: `${combineProgrammingStreams(result)}${combineProgrammingStreams(result) ? '\n' : ''}${t('programming.timedOut', 'Execution timed out.')}`
      });
      return;
    }
    if (typeof result.exitCode === 'number' && result.exitCode !== 0) {
      setProgrammingOutput(panel, {
        state: 'error',
        statusText: t('programming.runtimeError', 'Runtime error'),
        body: combineProgrammingStreams(result)
      });
      return;
    }
    setProgrammingOutput(panel, {
      state: 'success',
      statusText: t('programming.success', 'Finished'),
      body: combineProgrammingStreams(result)
    });
  } catch (_error) {
    setProgrammingOutput(panel, {
      state: 'error',
      statusText: t('programming.error', 'Error'),
      body: t('programming.failedRequest', 'Code execution failed. Please try again later.')
    });
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function checkProgrammingExecutionStatus(container) {
  const token = localStorage.getItem('token') || '';
  if (!token) return;
  try {
    const response = await fetch(`${window.API_BASE || '/api'}/programming/status`, { headers: { Authorization: `Bearer ${token}` } });
    const status = await response.json();
    if (!response.ok || status.available) return;
    const unavailableMessage = status.blocker || t('programming.unavailable', 'Code execution is temporarily unavailable.');
    const localRuntimeMessage = t('coverage.localRuntimeNote', 'Use a local language runtime to execute your code.');
    // One concise studio-level notice instead of a repeated note per lesson.
    if (!container.querySelector('.programming-provider-note')) {
      const banner = document.createElement('p');
      banner.className = 'programming-provider-note';
      banner.setAttribute('role', 'status');
      banner.textContent = `${unavailableMessage} ${localRuntimeMessage}`;
      container.prepend(banner);
    }
    container.querySelectorAll('[data-run-code]').forEach(button => {
      button.disabled = true;
      button.title = unavailableMessage;
      // The static practice note promises a sandbox. Rewrite it wherever Run
      // is disabled so the page never advertises execution it cannot provide.
      const practiceNote = button.closest('.programming-practice')?.querySelector('.programming-practice-note');
      if (practiceNote) practiceNote.textContent = `${unavailableMessage} ${localRuntimeMessage}`;
    });
  } catch (_error) {
    // A status-check failure does not claim execution works; the run request
    // remains the source of truth and reports an unavailable/error response.
  }
}

function renderProgrammingStudio() {
  const config = window.PROGRAMMING_STUDIO_CONFIG;
  const container = document.getElementById('programming-track-list');
  const presentation = document.getElementById('programming-presentation-points');
  if (!config || !container) return;

  container.innerHTML = config.tracks.map(renderProgrammingTrack).join('');
  checkProgrammingExecutionStatus(container);
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
      if (button) {
        const editor = document.getElementById(`${button.dataset.copyDraft}-draft`);
        if (editor) {
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
        }
        return;
      }

      const runButton = event.target.closest('[data-run-code]');
      if (runButton) {
        runProgrammingCode(runButton);
        return;
      }

      const resetButton = event.target.closest('[data-reset-code]');
      if (resetButton) {
        const editor = document.getElementById(`${resetButton.dataset.target}-draft`);
        if (editor) {
          editor.value = editor.defaultValue;
          editor.focus();
        }
        return;
      }

      const clearButton = event.target.closest('[data-clear-output]');
      if (clearButton) {
        const practice = clearButton.closest('.programming-practice');
        const panel = practice ? practice.querySelector('[data-output-panel]') : null;
        if (panel) {
          panel.hidden = true;
          panel.removeAttribute('data-state');
          const statusEl = panel.querySelector('[data-output-status]');
          const bodyEl = panel.querySelector('[data-output-body]');
          if (statusEl) statusEl.textContent = '';
          if (bodyEl) bodyEl.textContent = '';
        }
        return;
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
