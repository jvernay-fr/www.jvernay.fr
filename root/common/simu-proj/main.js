
const Simulation = {
    state: new State(),
    
    Reset() { 
        Person._globalId = 0;
        this.state = new State();
        this.state.eventQueue.push(0, Event.EnterBuilding(this.state.F));
        Rendering.state(this.state);
    },
    AdvanceDetailed() {
        this.state.advance();
        Rendering.state(this.state);
    },
    Advance() {
        do {
            this.state.advance();
        } while (this.state.timeNow === this.state.eventQueue.entries[0].priority);
        Rendering.state(this.state);
    },

    _advanceAutoExtraTime: 0,
    AdvanceAuto(lastNow) {
        if (lastNow === undefined) lastNow = Date.now();
        if (!Parameters.autoAdvance) return;
        const now = Date.now();
        const deltaMs = now - lastNow;

        const factor = Parameters.advanceMax ? 1000000 : Parameters.advanceFactor;
        const maxT = deltaMs * factor * 0.001 + this._advanceAutoExtraTime;
        this._advanceAutoExtraTime = maxT % 1;
        this.state.timeNow += Math.floor(maxT);
        

        while (this.state.eventQueue.entries[0].priority <= this.state.timeNow)
            this.state.advance();
        Rendering.state(this.state);

        setTimeout(() => this.AdvanceAuto(now), Math.max(0, 200 - Date.now()));
    },
};

Simulation.Reset();
