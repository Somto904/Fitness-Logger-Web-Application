
export default class WorkoutTracker{
    static LOCAL_STORAGE_KEY = "workout-tracker-entries";

    constructor(root) {
        this.root = root;
        this.root.insertAdjacentHTML("afterbegin", WorkoutTracker.html())
        this.entries = [];

        this.loadEntries();
        this.updateView();

        this.root.querySelector(".tracker__add").addEventListener ("click", () => {
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0"); 
            const day = date.getDate().toString().padStart(2, "0"); 

            this.addEntry({
                date: `${year}-${month}-${day}`,
                workout: "walking",
                duration: 30
            });
        });
    }

    static html() {
        return `
            <table class="tracker">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Workout</th>
                        <th>Duration</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody class="tracker__entries"></tbody>
                <tbody>
                    <tr class = "tracker__row tracker__row--add">
                        <td colspan= "4">
                            <span class="tracker__add">Add Entry &plus;</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }
    static rowHtml() {
        return `
            <tr class = "tracker__row">
                <td>
                    <input type="date" class="tracker__date">
                </td>
                <td>
                    <div class="workout-search">
                        <input type="text" class="tracker__workout" placeholder="Search exercise…">
                        <div class="workout-results" style="position:relative;">
                            <ul class="workout-results__list" style="position:absolute;z-index:10;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:6px;padding:6px 0;margin:6px 0 0;display:none;max-height:220px;overflow:auto;"></ul>
                        </div>
                    </div>
                </td>
                <td>
                    <input type="number" class = "tracker__duration">
                    <span class ="tracker__text">minutes</span>
                </td>
                <td>
                    <button type = "button" class="tracker__button tracker__delete">&times;</button>
                </td>
            </tr>
        `;
    }

    loadEntries() {
        this.entries = JSON.parse(localStorage.getItem(WorkoutTracker.LOCAL_STORAGE_KEY) || "[]");
    }

    saveEntries() {
        localStorage.setItem(WorkoutTracker.LOCAL_STORAGE_KEY, JSON.stringify(this.entries));
        window.dispatchEvent(new CustomEvent("entries-changed"));
    }

    updateView() {
        const tableBody = this.root.querySelector(".tracker__entries");
        const addRow = data => {
            const template = document.createElement("template");
            let row = null

            template.innerHTML = WorkoutTracker.rowHtml().trim();
            row = template.content.firstElementChild;

            row.querySelector(".tracker__date").value = data.date;
            row.querySelector(".tracker__workout").value = data.workout;
            row.querySelector(".tracker__duration").value = data.duration;

            row.querySelector(".tracker__date").addEventListener("change", e => {
                data.date = e.target.value;
                this.saveEntries();
                
            });
            const workoutInput = row.querySelector(".tracker__workout");
            const resultsList = row.querySelector(".workout-results__list");
            
            workoutInput.value = data.workout || "";
            let searchTimer = null;
            workoutInput.addEventListener("input", (e) => {
                const q = e.target.value.trim();
                data.workout = q;
                delete data.workoutId;
                this.saveEntries();

                clearTimeout(searchTimer);
                if (!q) {
                    resultsList.style.display = "none";
                    resultsList.innerHTML = "";
                    return;
                }
                searchTimer = setTimeout(async () => {
                    let q2 = q.trim();
                    if (q2.endsWith("s") && q2.length > 3) q2 = q2.slice(0, -1);
                    if (q2.length < 2) {
                        resultsList.style.display = "none";
                        resultsList.innerHTML = "";
                        return;
                    }
                    const results = await WorkoutTracker.searchExercises(q2);
                    console.log("WGER results for", q2, results);
                    WorkoutTracker.renderResults(results, resultsList, (chosen) => {
                        if (!chosen || !chosen.name) return;
                        workoutInput.value = chosen.name;
                        data.workout = chosen.name;
                        data.workoutId = chosen.id;
                        this.saveEntries();
                        resultsList.style.display = "none";
                        resultsList.innerHTML = "";
                    });
                }, 250);
            });

            workoutInput.addEventListener("blur", () => {
                setTimeout(() => {
                    resultsList.style.display = "none";
                }, 200);
            });
                
            
            row.querySelector(".tracker__duration").addEventListener("change", e => {
                data.duration = e.target.value;
                this.saveEntries();
                
            });
            
            row.querySelector(".tracker__delete").addEventListener("click", () => {
                this.deleteEntry(data);
            
            });
            tableBody.appendChild(row);
        };

        tableBody.querySelectorAll(".tracker__row").forEach(row => {
            row.remove();
        });

        this.entries.forEach(data => addRow(data));

    }

    addEntry(data){
        this.entries.push(data);
        this.saveEntries();
        this.updateView();
    }

    deleteEntry(dataToDelete){
        this.entries = this.entries.filter(data => data !== dataToDelete);
        this.saveEntries();
        this.updateView();
    }

    static async searchExercises(query) {
        const base = 'https://wger.de/api/v2/exerciseinfo/';
        const url = `${base}?limit=15&language=2&search=${encodeURIComponent(query)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const items = (data.results || []).map(r => {
                const en = (r.translations || []).find(t => t.language === 2);
                return{
                    id: r.id,
                    name: en ? en.name : (r.translations && r.translations[0] ? r.translations[0].name : 'Unnamed'),
                    description: en ? en.description : ''
                };
            }).filter(x => x.name && x.name !== 'Unnamed');
            const q = query.trim().toLowerCase();
            const filtered = items.length
              ? items.filter(x => x.name.toLowerCase().includes(q))
              : [];
            return filtered;
        }   catch (e) {
            console.error("WGER search failed", e); 
            return []; 
        } 

    
    } 


    static renderResults(results, listEl, onPick) {
        listEl.innerHTML = "";
        const items = Array.isArray(results) ? results.filter(r => r && r.name) : [];
        if (!items.length) {
            const li = document.createElement("li");
            li.textContent = "No results";
            li.style.cssText = "padding:8px 12px;color:#666;cursor:default;";
            listEl.appendChild(li);
            listEl.style.display = "block";
            return;
        }
        results.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.name;
            li.style.cssText = "padding:8px 12px;cursor:pointer;";
            li.addEventListener("mouseenter", () => li.style.background = "#f6f6f6");
            li.addEventListener("mouseleave", () => li.style.background = "");

            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                if (!item || !item.name) return;
                onPick(item);
            });
            listEl.appendChild(li);
        });
        listEl.style.display = "block";
    }


}