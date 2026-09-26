// Exam page. Attempt state, answers, timing, and scoring are server-authoritative.
(function() {
    let exam = null;
    let questions = [];
    let attemptId = null;
    let currentQuestionIndex = 0;
    let courseId = null;
    let userAnswers = {};
    let deadlineAt = null;
    let timerInterval = null;
    let submitting = false;
    let crossword = null;
    const crosswordSaveTimers = new Map();
    const crosswordLetters = new Map();

    const examHeaderDiv = document.getElementById('exam-header');
    const examProgressDiv = document.getElementById('exam-progress');
    const examQuestionCounterDiv = document.getElementById('exam-question-counter');
    const examQuestionNumberSpan = document.getElementById('exam-question-number');
    const examTotalQuestionsSpan = document.getElementById('exam-total-questions');
    const examQuestionAreaDiv = document.getElementById('exam-question-area');
    const examActionsDiv = document.getElementById('exam-actions');

    function authHeaders(json = false) {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` };
        if (json) headers['Content-Type'] = 'application/json';
        return headers;
    }

    async function requestJson(url, options = {}) {
        const response = await fetch(url, options);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(body.error || `Request failed (${response.status})`);
            error.status = response.status;
            error.body = body;
            throw error;
        }
        return body;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    async function fetchExam(examId) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}`, { headers: authHeaders() });
    }

    async function startExamAttempt(examId, retry = false) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/start`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(retry ? { retry: true } : {})
        });
    }

    async function saveExamAnswer(examId, currentAttemptId, questionId, optionId) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/answers`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({
                attempt_id: currentAttemptId,
                question_id: questionId,
                selected_option_id: optionId
            })
        });
    }

    async function submitExamAttempt(examId, currentAttemptId) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/submit`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ attempt_id: currentAttemptId })
        });
    }

    async function getExamAttemptResult(examId, currentAttemptId) {
        const query = new URLSearchParams({ attempt_id: currentAttemptId });
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/result?${query}`, {
            headers: authHeaders()
        });
    }

    async function fetchCrossword(examId, currentAttemptId) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/attempts/${encodeURIComponent(currentAttemptId)}/crossword`, { headers: authHeaders() });
    }

    async function saveCrosswordAnswer(examId, currentAttemptId, clueId, answer) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/crossword/answers`, {
            method: 'POST', headers: authHeaders(true),
            body: JSON.stringify({ attempt_id: currentAttemptId, clue_id: clueId, answer })
        });
    }

    async function submitCrossword(examId, currentAttemptId) {
        return requestJson(`/api/exams/${encodeURIComponent(examId)}/crossword/submit`, {
            method: 'POST', headers: authHeaders(true),
            body: JSON.stringify({ attempt_id: currentAttemptId })
        });
    }

    function stopTimer() {
        if (timerInterval) window.clearInterval(timerInterval);
        timerInterval = null;
    }

    function renderExamHeader() {
        examHeaderDiv.innerHTML = `
            <h1 class="exam-title">${escapeHtml(exam.title)}</h1>
            <div class="exam-course">${escapeHtml(exam.description || '')}</div>
            <div class="exam-timer" id="exam-timer" role="status" aria-live="polite"></div>
        `;
    }

    function showAnswerSaveError(message) {
        const status = document.getElementById('exam-status-message');
        if (status) {
            status.textContent = message;
            status.hidden = false;
        }
    }

    function renderQuestion(questionIndex) {
        const question = questions[questionIndex];
        if (!question) return;
        const selectedId = userAnswers[question.id];

        examQuestionAreaDiv.innerHTML = `
            <h2 class="question-text" id="exam-question-prompt">${escapeHtml(question.questionText)}</h2>
            <fieldset class="question-options" aria-labelledby="exam-question-prompt">
                ${question.options.map(option => `
                    <label class="option-label ${selectedId === option.id ? 'selected' : ''}">
                        <input type="radio" class="option-radio" name="question_${escapeHtml(question.id)}" value="${escapeHtml(option.id)}" ${selectedId === option.id ? 'checked' : ''}>
                        <span class="option-text">${escapeHtml(option.optionText)}</span>
                    </label>
                `).join('')}
            </fieldset>
            <p id="exam-status-message" role="status" aria-live="polite" hidden></p>
        `;

        examQuestionAreaDiv.querySelectorAll('.option-radio').forEach(input => {
            input.addEventListener('change', async () => {
                const oldAnswer = userAnswers[question.id];
                userAnswers[question.id] = input.value;
                examQuestionAreaDiv.querySelectorAll('.option-label').forEach(label => {
                    label.classList.toggle('selected', label.querySelector('input')?.checked === true);
                });
                updateQuestionCounter();
                examQuestionAreaDiv.querySelectorAll('.option-radio').forEach(radio => { radio.disabled = true; });
                try {
                    await saveExamAnswer(exam.id, attemptId, question.id, input.value);
                    const status = document.getElementById('exam-status-message');
                    if (status) status.hidden = true;
                } catch (error) {
                    if (error.status === 410 && error.body?.result) {
                        renderResults(error.body.result);
                        return;
                    }
                    if (oldAnswer === undefined) delete userAnswers[question.id];
                    else userAnswers[question.id] = oldAnswer;
                    showAnswerSaveError(error.message || 'Your answer could not be saved. Please try again.');
                    renderQuestion(currentQuestionIndex);
                } finally {
                    examQuestionAreaDiv.querySelectorAll('.option-radio').forEach(radio => { radio.disabled = false; });
                }
            });
        });
    }

    function updateQuestionCounter() {
        examQuestionNumberSpan.textContent = questions.length ? String(currentQuestionIndex + 1) : '0';
        examTotalQuestionsSpan.textContent = String(questions.length);
        const answered = Object.keys(userAnswers).length;
        const percent = questions.length ? Math.round((answered / questions.length) * 100) : 0;
        const percentLabel = document.getElementById('exam-progress-percent');
        const progressFill = document.getElementById('exam-progress-fill');
        if (percentLabel) percentLabel.textContent = `${percent}%`;
        if (progressFill) progressFill.style.width = `${percent}%`;
    }

    function updateNavigation(examId) {
        const previous = document.getElementById('btn-prev-question');
        const next = document.getElementById('btn-next-question');
        previous.disabled = currentQuestionIndex <= 0;
        next.disabled = currentQuestionIndex >= questions.length - 1;
        previous.onclick = () => navigateQuestion(-1, examId);
        next.onclick = () => navigateQuestion(1, examId);
    }

    function navigateQuestion(delta, examId) {
        currentQuestionIndex = Math.max(0, Math.min(questions.length - 1, currentQuestionIndex + delta));
        const url = new URL(window.location.href);
        url.searchParams.set('id', examId);
        url.searchParams.set('question', String(currentQuestionIndex));
        window.history.replaceState({}, '', url);
        renderQuestion(currentQuestionIndex);
        updateQuestionCounter();
        updateNavigation(examId);
    }

    function startDeadlineTimer() {
        stopTimer();
        const timer = document.getElementById('exam-timer');
        if (!deadlineAt || !timer) return;
        const tick = () => {
            const remaining = Math.max(0, new Date(deadlineAt).getTime() - Date.now());
            const seconds = Math.ceil(remaining / 1000);
            const minutesLabel = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secondsLabel = String(seconds % 60).padStart(2, '0');
            timer.textContent = `Time remaining: ${minutesLabel}:${secondsLabel}`;
            if (remaining <= 0) {
                stopTimer();
                submitAttempt(true);
            }
        };
        tick();
        timerInterval = window.setInterval(tick, 1000);
    }

    function renderResults(result) {
        stopTimer();
        const expired = result.status === 'expired';
        examHeaderDiv.innerHTML = `
            <h1 class="results-title">${escapeHtml(exam.title)}</h1>
            <div class="exam-course">${escapeHtml(exam.description || '')}</div>
            <div class="results-score ${result.passed ? 'results-pass' : 'results-fail'}">${Number(result.final_score ?? result.score) || 0}%</div>
            <div class="results-details" role="status">
                ${expired ? 'Time expired. ' : ''}Final score: ${Number(result.final_score ?? result.score) || 0}% (Passing: ${Number(result.passing_score ?? exam.passing_score) || 0}%)<br>
                ${result.mcq ? `Part A: ${Number(result.mcq.percentage ?? result.mcq.score) || 0}% (${Number(result.mcq.correct) || 0}/${Number(result.mcq.total) || 0})<br>` : ''}
                ${result.crossword ? `Part B: ${Number(result.crossword.percentage ?? result.crossword.score) || 0}% (${Number(result.crossword.correct) || 0}/${Number(result.crossword.total) || 0})<br>` : ''}
                Status: ${result.passed ? 'PASS' : 'FAIL'}<br>
                Answered: ${Number(result.answered_questions) || 0} / ${Number(result.total_questions) || 0} MCQs
            </div>
        `;
        examProgressDiv.style.display = 'none';
        examQuestionCounterDiv.style.display = 'none';
        examQuestionAreaDiv.innerHTML = '';
        examActionsDiv.innerHTML = `
            <div class="exam-certificate-status" id="exam-certificate-status" role="status" aria-live="polite"></div>
            <button id="btn-retry-exam" class="btn-exam component-button">Retry Exam</button>
            <button id="btn-return-course" class="btn-exam component-button">Return to Course</button>
        `;
        document.getElementById('btn-retry-exam').addEventListener('click', () => initExam(true));
        document.getElementById('btn-return-course').addEventListener('click', () => {
            window.location.href = `course-detail.html?id=${encodeURIComponent(exam.course_id)}`;
        });
        if (result.passed && !expired) issuePassedCertificate();
    }

    async function issuePassedCertificate() {
        const status = document.getElementById('exam-certificate-status');
        if (!status || !exam?.course_id) return;
        status.textContent = 'Preparing your certificate…';
        try {
            const issued = await requestJson(`/api/certificate/${encodeURIComponent(exam.course_id)}/issue`, {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({})
            });
            const link = document.createElement('a');
            link.className = 'component-button';
            link.href = `certificate.html?certificateId=${encodeURIComponent(issued.certificate.certificateId)}`;
            link.textContent = 'View your CareerPath AI certificate';
            status.replaceChildren(link);
        } catch (_error) {
            status.textContent = 'Your exam was passed. Your certificate is not available yet; revisit this course page later.';
        }
    }

    function renderExpired(result) {
        const safeResult = result || {
            attempt_id: attemptId,
            score: 0,
            passed: false,
            total_questions: questions.length,
            answered_questions: Object.keys(userAnswers).length,
            status: 'expired'
        };
        renderResults(safeResult);
    }

    async function submitAttempt(fromTimer = false) {
        if (submitting || !attemptId || !exam) return;
        submitting = true;
        const submitButton = document.getElementById('btn-submit-exam');
        if (submitButton) submitButton.disabled = true;
        try {
            const submitted = await submitExamAttempt(exam.id, attemptId);
            if (submitted.status === 'part_b') {
                const crosswordData = await fetchCrossword(exam.id, attemptId);
                renderCrossword(crosswordData);
                deadlineAt = crosswordData.deadline_at || deadlineAt;
                startDeadlineTimer();
            } else {
                const result = submitted.status ? submitted : await getExamAttemptResult(exam.id, attemptId);
                renderResults(result);
            }
        } catch (error) {
            if (error.status === 410 && error.body?.result) renderExpired(error.body.result);
            else if (fromTimer && error.status === 409) {
                const result = await getExamAttemptResult(exam.id, attemptId);
                renderResults(result);
            } else showErrorState(error.message || 'Failed to submit exam. Please try again.');
        } finally {
            submitting = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    function clueCells(clue) {
        const cells = [];
        const dr = clue.direction === 'down' ? 1 : 0;
        const dc = clue.direction === 'across' ? 1 : 0;
        for (let i = 0; i < Number(clue.answer_length || 0); i++) cells.push([Number(clue.row) + dr * i, Number(clue.column) + dc * i]);
        return cells;
    }

    function renderCrossword(data) {
        stopTimer();
        crossword = data.crossword || data;
        crossword.deadline_at = data.deadline_at || crossword.deadline_at;
        crosswordLetters.clear();
        (crossword.clues || []).forEach(clue => {
            const answer = String(clue.submitted_answer || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
            clueCells(clue).forEach(([row, col], index) => {
                const key = `${row},${col}`;
                if (answer[index]) crosswordLetters.set(key, answer[index]);
            });
        });
        examHeaderDiv.innerHTML = `<h1 class="exam-title">${escapeHtml(exam.title)}</h1><div class="exam-course">Part B: Crossword</div><div class="exam-timer" id="exam-timer" role="status" aria-live="polite"></div>`;
        examProgressDiv.style.display = 'none';
        examQuestionCounterDiv.style.display = 'none';
        const occupied = new Map();
        const starts = new Map();
        (crossword.clues || []).forEach(clue => {
            const cells = clueCells(clue);
            if (cells.length) {
                const startKey = `${cells[0][0]},${cells[0][1]}`;
                const existing = starts.get(startKey);
                starts.set(startKey, existing ? `${existing}/${clue.clue_number}` : String(clue.clue_number));
            }
            cells.forEach(([row, col]) => {
                const key = `${row},${col}`;
                if (!occupied.has(key)) occupied.set(key, []);
                occupied.get(key).push(clue.id);
            });
        });
        const rows = Number(crossword.rows || crossword.grid_rows), cols = Number(crossword.columns || crossword.grid_columns);
        let grid = '';
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
            const key = `${row},${col}`;
            if (!occupied.has(key)) grid += '<span class="crossword-cell crossword-block" aria-hidden="true"></span>';
            else grid += `<label class="crossword-cell"><span class="crossword-number">${escapeHtml(starts.get(key) || '')}</span><input class="crossword-letter" data-cell="${key}" maxlength="1" autocomplete="off" autocapitalize="characters" aria-label="Row ${row + 1}, column ${col + 1}" value="${escapeHtml(crosswordLetters.get(key) || '')}"></label>`;
        }
        const across = (crossword.clues || []).filter(clue => clue.direction === 'across');
        const down = (crossword.clues || []).filter(clue => clue.direction === 'down');
        const clueList = (items) => items.map(clue => `<li><button type="button" class="crossword-clue" data-clue="${escapeHtml(clue.id)}"><strong>${escapeHtml(clue.clue_number)}.</strong> ${escapeHtml(clue.clue_text)}</button></li>`).join('');
        examQuestionAreaDiv.innerHTML = `
            <h2 class="question-text">Complete the crossword</h2>
            <p>Fill the letter cells. Your answers save as you work.</p>
            <div class="crossword-scroll"><div class="crossword-board" style="--crossword-columns:${cols}">${grid}</div></div>
            <div class="crossword-clues"><section><h3>Across</h3><ol>${clueList(across)}</ol></section><section><h3>Down</h3><ol>${clueList(down)}</ol></section></div>
            <p id="exam-status-message" role="status" aria-live="polite" hidden></p>`;
        examActionsDiv.innerHTML = `<button id="btn-submit-crossword" class="btn-exam component-button">Submit final exam</button><button id="btn-return-course" class="btn-exam component-button">Return to Course</button>`;
        examQuestionAreaDiv.querySelectorAll('.crossword-letter').forEach(input => input.addEventListener('input', onCrosswordInput));
        examQuestionAreaDiv.querySelectorAll('.crossword-clue').forEach(button => button.addEventListener('click', () => {
            const clue = (crossword.clues || []).find(item => item.id === button.dataset.clue);
            const first = clue && clueCells(clue)[0];
            if (first) examQuestionAreaDiv.querySelector(`[data-cell="${first[0]},${first[1]}"]`)?.focus();
        }));
        document.getElementById('btn-submit-crossword').addEventListener('click', async () => {
            if (!window.confirm('Submit Part B and finish this final exam?')) return;
            const button = document.getElementById('btn-submit-crossword');
            button.disabled = true;
            try { await flushCrosswordSaves(); renderResults(await submitCrossword(exam.id, attemptId)); }
            catch (error) { showAnswerSaveError(error.message || 'Could not submit the crossword.'); button.disabled = false; }
        });
        document.getElementById('btn-return-course').addEventListener('click', () => { window.location.href = `course-detail.html?id=${encodeURIComponent(exam.course_id)}`; });
    }

    function onCrosswordInput(event) {
        const input = event.currentTarget;
        const key = input.dataset.cell;
        const letter = String(input.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
        input.value = letter;
        if (letter) crosswordLetters.set(key, letter); else crosswordLetters.delete(key);
        const clueIds = new Set();
        (crossword?.clues || []).forEach(clue => {
            if (clueCells(clue).some(([row, col]) => `${row},${col}` === key)) clueIds.add(clue.id);
        });
        clueIds.forEach(clueId => {
            const clue = crossword.clues.find(item => item.id === clueId);
            const answer = clueCells(clue).map(([row, col]) => crosswordLetters.get(`${row},${col}`) || ' ').join('');
            const previous = crosswordSaveTimers.get(clueId);
            if (previous) window.clearTimeout(previous);
            crosswordSaveTimers.set(clueId, window.setTimeout(async () => {
                try { await saveCrosswordAnswer(exam.id, attemptId, clueId, answer); }
                catch (error) { showAnswerSaveError(error.message || 'A crossword answer could not be saved.'); }
            }, 300));
        });
    }

    async function flushCrosswordSaves() {
        for (const timer of crosswordSaveTimers.values()) window.clearTimeout(timer);
        crosswordSaveTimers.clear();
        await Promise.all((crossword?.clues || []).map(clue => {
            const answer = clueCells(clue).map(([row, col]) => crosswordLetters.get(`${row},${col}`) || ' ').join('');
            return saveCrosswordAnswer(exam.id, attemptId, clue.id, answer);
        }));
    }
    function setupSubmitButton() {
        const submitButton = document.getElementById('btn-submit-exam');
        submitButton.onclick = async () => {
            const unanswered = questions.filter(question => !userAnswers[question.id]).length;
            if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? '' : 's'} remain unanswered. Submit anyway?`)) return;
            await submitAttempt(false);
        };
    }

    async function initExam(retry = false) {
        stopTimer();
        submitting = false;
        const params = new URLSearchParams(window.location.search);
        const examId = params.get('id');
        if (!examId) {
            showErrorState('No exam ID provided. Please return to the course page and select an exam.');
            return;
        }
        examProgressDiv.style.display = '';
        examQuestionCounterDiv.style.display = '';
        examActionsDiv.style.display = '';

        try {
            exam = await fetchExam(examId);
            courseId = exam.course_id;
            const attemptData = await startExamAttempt(examId, retry);
            attemptId = attemptData.attempt_id;
            if (attemptData.status === 'submitted' || attemptData.status === 'expired') {
                renderResults(attemptData);
                return;
            }
            if (attemptData.status === 'part_b') {
                deadlineAt = attemptData.deadline_at;
                renderExamHeader();
                const crosswordData = await fetchCrossword(exam.id, attemptId);
                renderCrossword(crosswordData);
                deadlineAt = crosswordData.deadline_at || deadlineAt;
                startDeadlineTimer();
                return;
            }
            if (attemptData.status === 'active' && attemptData.deadline_at && new Date(attemptData.deadline_at) <= new Date()) {
                const result = await submitExamAttempt(exam.id, attemptId);
                renderResults(result);
                return;
            }

            questions = attemptData.questions || [];
            userAnswers = attemptData.answers || {};
            deadlineAt = attemptData.deadline_at;
            if (!attemptId || !questions.length) throw new Error('The server returned an invalid exam attempt.');

            currentQuestionIndex = Math.max(0, Math.min(Number.parseInt(params.get('question'), 10) || 0, questions.length - 1));
            renderExamHeader();
            renderQuestion(currentQuestionIndex);
            updateQuestionCounter();
            updateNavigation(examId);
            setupSubmitButton();
            startDeadlineTimer();
        } catch (error) {
            console.error('Error initializing exam:', error);
            if (error.status === 410 && error.body?.result) renderExpired(error.body.result);
            else showErrorState(error.message || 'Failed to load exam. Please try again later.');
        }
    }

    function showErrorState(message) {
        stopTimer();
        examHeaderDiv.innerHTML = `
            <div class="empty-state" role="alert">
                <div class="empty-state-icon"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i></div>
                <p>${escapeHtml(message)}</p>
                <a href="course-detail.html?id=${encodeURIComponent(courseId || 'intro_to_ai')}" class="component-button" style="margin-top: var(--space-4);">Return to Course</a>
            </div>
        `;
        examProgressDiv.style.display = 'none';
        examQuestionCounterDiv.style.display = 'none';
        examQuestionAreaDiv.innerHTML = '';
        examActionsDiv.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', () => initExam(), { once: true });
})();
