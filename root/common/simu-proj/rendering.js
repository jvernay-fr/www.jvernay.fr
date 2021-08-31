

const Rendering = {
    time(t) {
        let html = "";
        if (t / 3600 >= 1) {
            html += `${Math.floor(t/3600)}h `;
            t = t % 3600;
        }
        if (t / 60 >= 1) {
            html += `${Math.floor(t/60)}m `;
            t = t % 60;
        }
        html += `${t}s`;
        return html;
    },

    queue(entries) {
        // print in reverse order, so that first people are on the right.
        let html = "";
        for (let i = entries.length - 1; i >= 0; --i)
            html += entries[i].elem.html();
        return html;
    },
        
    people(people) {
        let html = "";
        for (let person of people)
            html += person.html();
        return html;
    },

    events(state) {
        let html = `<h2>${TRANSLATIONS.nextEvents}</h2>`;
        for (let entry of state.eventQueue.entries)
            html += `<li><time>t = ${Rendering.time(entry.priority)}</time> : ${entry.elem.text}`+
                    ` (${TRANSLATIONS.inTime} ${Rendering.time(entry.priority - state.timeNow)})</li>`;
        document.getElementById("render-next-events").innerHTML = html;

        html = `<h2>${TRANSLATIONS.previousEvents}</h2>`;
        for (let pastEvent of state.previousEvents)
            html += `<li><time>t = ${Rendering.time(pastEvent.t)}</time> : ${pastEvent.text}</li>`;
        document.getElementById("render-previous-events").innerHTML = html;
    },

    state(state) {
        
        document.getElementById("render-time").innerHTML = "t = " + Rendering.time(state.timeNow);
        if (Parameters.noRendering) return;

        let html = `<table>`;
        html += `<tr><th>${TRANSLATIONS.titleFloor}</th>` +
                    `<th>${TRANSLATIONS.titleOffice}</th>` +
                    `<th>${TRANSLATIONS.titleQueue}</th>` +
                    `<th colspan="${state.N}">${TRANSLATIONS.titleElevators}</th></tr>`;
        for (let f = state.F - 1; f >= 0; --f) {
            html += `<tr><td>${f}</td><td>${Rendering.people(state.offices[f])}</td><td class="queue">` + Rendering.queue(state.floorQueues[f].entries) + `</td>`;
            for (let elevator of state.elevators) {
                if (elevator.floor === f)
                    html += '<td>' + Rendering.people(elevator.people) + '</td>';
                else
                    html += '<td>X</td>';
            }
            html += `</tr>`;
        }
        html += '</table>';

        document.getElementById("render-simu").innerHTML = html;
        Rendering.events(state);
        Rendering.stats(state);
    },

    stats(state) {
        Plotly.react("render-timeWaiting", state.stats.timeWaiting,
                       {title: TRANSLATIONS.stats.timeWaiting, datarevision: state.timeNow});
        Plotly.react("render-peopleLocations", state.stats.peopleLocations,
                    {title: TRANSLATIONS.stats.peopleLocations, datarevision: state.timeNow});
    }
};
