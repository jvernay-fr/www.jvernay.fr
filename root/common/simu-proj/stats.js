

class Stats {

    constructor(state) {

        // setup plots data
        this.timeWaiting = [];
        for (let i = 0; i < state.F; ++i)
            this.timeWaiting.push({
                x: [], type: "box", name: `${TRANSLATIONS.titleFloor} ${i}`,
            });
        this.timeWaitingTotal = {  x: [], type: "box", name: TRANSLATIONS.stats.total };
        this.timeWaiting.push(this.timeWaitingTotal);
        // Arrays are passed by referenced, so updating peopleLocationsX will update every 'x'.
        this.peopleLocationsX = [];
        this.peopleLocations = [
            // [0]: people waiting in queue
            {x:this.peopleLocationsX, y:[], stackgroup:"one", name:TRANSLATIONS.stats.peopleInQueue},
            // [1]: people in elevators
            {x:this.peopleLocationsX, y:[], stackgroup:"one", name:TRANSLATIONS.stats.peopleInElevator},
            // [2]: people at work
            {x:this.peopleLocationsX, y:[], stackgroup:"one", name:TRANSLATIONS.stats.peopleAtWork},
        ];
    }

    addTimeWaiting(floor, t) {
        this.timeWaiting[floor].x.push(t);
        this.timeWaitingTotal.x.push(t);
    }

    personMoved(t, from, to) {
        // 'from' and 'to' are one of "queue", "elevator", "work", null
        // (null means "outside the system")

        if (t !== this.peopleLocationsX[this.peopleLocationsX.length-1]) {
            this.peopleLocationsX.push(t);
            for (let counters of this.peopleLocations)
                counters.y.push(counters.y[counters.y.length-1] || 0);
        }
        
        from = ["queue","elevator","work"].indexOf(from);
        if (from != -1)
            --this.peopleLocations[from].y[this.peopleLocations[from].y.length - 1];
        
        to = ["queue","elevator","work"].indexOf(to);
        if (to != -1)
            ++this.peopleLocations[to].y[this.peopleLocations[to].y.length - 1];
    }

};