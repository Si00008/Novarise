Novarise
A daily life dashboard you open once a day.

Novarise is a frontend-only personal life management and data tracking dashboard. This project aims to create an easily accessible platform for daily life, aggregating daily to-dos, habit building, mood tracking, and other features, while leaving room for rich extension interfaces.

✨ Core Features

-To-Do List: Supports sorting by date, filtering by type, fuzzy date search, and real-time progress bar statistics.
-Habits & Check-ins: Customize habit names, icons, target counts, and long-term plans, with one-click check-ins.
-Mood Calendar: Combines a monthly view to record daily moods, displaying various event records in real-time via colored dots on the calendar.
-Global Smart Collapse: All cards can be collapsed. When collapsed, the title bar intelligently displays overview data (e.g., completion rate, today's mood).
-Journey: Supports retroactively viewing to-dos, check-ins, and mood data for any given day.
-Floating Power Query: Reserved a floating window interface in the bottom right corner, to be used later for connecting to rhythm game (DanceCube/maimai) score querying bots.

🛠 Tech Stack

- **Frontend**: Vanilla HTML5 + CSS3 + Vanilla JavaScript (No heavy third-party frameworks).
- **Data Storage**: Pure local lightweight storage based on browser `localStorage`, ensuring data privacy.
- **UI Design**: Adaptive responsive layout, supporting seamless dark mode switching.
- **Ecosystem Extension**: Planned deep integration with a QQ bot based on NoneBot2 (DanceCube/maimai score query).

🚀 How to Use

1. Clone or download the code from this repository.
2. Ensure `index.html`, `style.css`, and `app.js` are in the same directory.
3. Double-click `index.html` to run it directly in your browser.

📝 Roadmap

- [ ] Integrate backend API for multi-device cloud data synchronization.
- [ ] Deeply integrate QQ bot APIs for querying game power scores directly on the web.

📄 License

This project is licensed under the MIT License.
