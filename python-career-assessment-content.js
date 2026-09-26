module.exports = [
  {
    question: 'A Python script runs `total = 4` and then `total = total + 3`. What is the value of `total` afterward?',
    options: ['1', '7', '43', 'The variable is deleted'], correct: 1
  },
  {
    question: 'What type of value does Python’s `input()` return before you convert it?',
    options: ['Always an integer', 'Always a Boolean', 'A string', 'A list'], correct: 2
  },
  {
    question: 'A learner types `"8"` for a number of files. Which expression adds two files numerically?',
    options: ['"8" + 2', 'int("8") + 2', 'str("8") + 2', '"8" * 2'], correct: 1
  },
  {
    question: 'A program should recommend a short task when available time is exactly 30 minutes. Which condition includes that boundary?',
    options: ['minutes < 30', 'minutes <= 30', 'minutes == 30 only', 'minutes > 30'], correct: 1
  },
  {
    question: 'What values are printed by `for number in range(1, 4): print(number)`?',
    options: ['1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3', '4 only'], correct: 0
  },
  {
    question: 'A `while` loop is meant to count down from 3. What must the loop do to eventually stop?',
    options: ['Keep the counter unchanged', 'Change the counter so the condition becomes False', 'Rename the counter each time', 'Put the print statement outside the loop'], correct: 1
  },
  {
    question: 'Why is returning a value from a function often more reusable than printing it inside the function?',
    options: ['A return value can be stored, combined, or tested by the caller', 'Printing automatically saves the value in a file', 'A function can only print one kind of value', 'Return values make Python ignore parameters'], correct: 0
  },
  {
    question: 'Which collection is the clearest fit for mapping `.pdf` to `Documents`?',
    options: ['A dictionary', 'A tuple with no labels', 'A string', 'A set of unrelated values'], correct: 0
  },
  {
    question: 'A program needs to preserve a task sequence and append a new task later. Which collection fits best?',
    options: ['A list', 'A set', 'A Boolean', 'A fixed integer'], correct: 0
  },
  {
    question: 'Why might a set be useful when listing the file extensions found in a folder?',
    options: ['It keeps every duplicate in order', 'It stores only unique values', 'It automatically sorts files by size', 'It can store only numbers'], correct: 1
  },
  {
    question: 'What does `Path("Resume.PDF").suffix.lower()` produce?',
    options: ['".pdf"', '"Resume"', '"PDF"', '"resume.pdf"'], correct: 0
  },
  {
    question: 'Which pattern ensures a text file is closed even if reading raises an error?',
    options: ['`with open(path, encoding="utf-8") as file:`', '`file = open(path)` with no later close', '`print(open(path))`', '`open(path, "never-close")`'], correct: 0
  },
  {
    question: 'Which format is a natural fit for rows with consistent columns such as filename and extension?',
    options: ['CSV', 'A Python traceback', 'A set', 'A Boolean'], correct: 0
  },
  {
    question: 'What is a suitable beginner use for JSON?',
    options: ['Store a dictionary of report counts in a readable file', 'Run arbitrary text as trusted Python code', 'Replace every folder with a database', 'Prevent all file errors'], correct: 0
  },
  {
    question: 'A requested folder does not exist. Which exception should a small file-counting function consider handling?',
    options: ['FileNotFoundError', 'KeyboardInterrupt only', 'SyntaxError only', 'ZeroDivisionError'], correct: 0
  },
  {
    question: 'When debugging an unexpected crash, which part of a traceback most often names the exception and its message?',
    options: ['The final line', 'The first blank line', 'The filename extension', 'The terminal prompt'], correct: 0
  },
  {
    question: 'A script must fetch a public JSON endpoint using only the Python standard library. Which module can make an HTTP request?',
    options: ['urllib.request', 'csv.writer', 'tkinter.Button', 'pathlib.Path'], correct: 0
  },
  {
    question: 'A file organizer should preview planned moves before changing files. Which design supports that safely?',
    options: ['Build and print a move plan; only call move code after explicit apply mode', 'Move each file as soon as it is discovered', 'Delete unknown files before reporting', 'Overwrite any destination with the same name'], correct: 0
  },
  {
    question: 'The organizer finds that `Documents/notes.pdf` already exists. What is the safest beginner behavior?',
    options: ['Skip the move and report the conflict', 'Overwrite it without asking', 'Rename and delete both files', 'Move it into a random folder'], correct: 0
  },
  {
    question: 'Which test best checks that preview mode has no side effects?',
    options: ['Confirm the report says what would move and that the source files remain in place', 'Run apply mode on a real downloads folder', 'Check only that the program starts', 'Delete the test folder before checking results'], correct: 0
  }
];
