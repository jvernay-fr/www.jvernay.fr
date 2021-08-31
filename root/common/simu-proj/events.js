

function pushNextElevatorEvent(state, elevator) {
    const nextObjective = state.nextElevatorObjective(elevator);
    if (nextObjective === undefined)
        return state.eventQueue.push(state.timeNow, Event.ElevatorSleep(elevator));
    const nextFloor = nextObjective === "up" ? elevator.floor + 1 : elevator.floor - 1;
    elevator.direction = nextObjective;
    state.eventQueue.push(state.timeNow + Parameters.elevatorSpeed, Event.ElevatorArrival(elevator, nextFloor));
}

// An event has a text (description) and an action (callback taking the state as argument).
// It can be invoked with myevent.run(mystate).
class Event {
    constructor(text, action) { this.text = text; this.action = action; };
    run(state) { this.action(state); };
    
    // Functions that returns events.
    
    static EnterBuilding(maxF) {
        const person = new Person();
        person.destFloor = Random.uniform_int(1, maxF);
        return new Event(TRANSLATIONS.events.enterBuilding(person), state => {
            const delay = Math.ceil(Random.exponential(Parameters.arrivalRate) * 60);
            state.eventQueue.push(state.timeNow, Event.EnterFloor(person, 0));
            state.eventQueue.push(state.timeNow + delay, Event.EnterBuilding(maxF));
        });
    }
    
    static EnterFloor(person, floor) {
        return new Event(TRANSLATIONS.events.enterFloor(person, floor), state => {
            person._waitingSince = state.timeNow;

            // if we can enter an elevator stopped at this floor, take it.
            for (let elevator of state.elevators)
                if (state.canEnter(person, floor, elevator)) {
                    state.eventQueue.push(state.timeNow, Event.EnterElevator(person, elevator));
                    if (elevator.sleeping)
                        state.eventQueue.push(state.timeNow, Event.ElevatorAwake(elevator));
                    return;
                }
            
            // else, join the queue and awake an elevator if one was sleeping,
            // NOTE: at equal priorities, first pushed events will be executed first.
            // So 'person' will enter the queue BEFORE awakening the elevator.
            state.eventQueue.push(state.timeNow, Event.EnterQueue(person, floor));
            
            for (let elevator of state.elevators)
                if (elevator.sleeping)
                    return state.eventQueue.push(state.timeNow, Event.ElevatorAwake(elevator));
        });
    }
    
    static EnterQueue(person, floor) {
        return new Event(TRANSLATIONS.events.enterQueue(person, floor), state => {
            state.floorQueues[floor].push(state.timeNow, person);
            state.stats.personMoved(state.timeNow, null, "queue");
        });
    }
    
    static EnterElevator(person, elevator) {
        return new Event(TRANSLATIONS.events.enterElevator(person, elevator), state => {
            if (elevator.people.length >= state.C) {
                // already too much people, fallback to enter the queue
                let nextEvent = Event.EnterQueue(person, elevator.floor);
                nextEvent.text += ` (${TRANSLATIONS.events.elevatorFull})`;
            }
            const index = state.floorQueues[elevator.floor].entries.findIndex(e => e.elem === person);
            if (index != -1) {
                state.floorQueues[elevator.floor].entries.splice(index, 1);
                state.stats.personMoved(state.timeNow, "queue", "elevator");
            } else {
                state.stats.personMoved(state.timeNow, null, "elevator");
            }
            person.handled = false;
            state.stats.addTimeWaiting(elevator.floor, state.timeNow - person._waitingSince);
            elevator.people.push(person);
        });
    }
    
    static ExitElevator(person, elevator) {
        return new Event(TRANSLATIONS.events.exitElevator(person, elevator), state => {
            elevator.people.remove_if(p => p === person);
            person.destFloor = null;
            if (elevator.floor > 0) {
                state.offices[elevator.floor].push(person);
                const delay = Math.ceil(Random.exponential(1 / Parameters.workTime) * 60);
                state.eventQueue.push(state.timeNow + delay, Event.ExitWork(person, elevator.floor));
                state.stats.personMoved(state.timeNow, "elevator", "work");
            } else {
                state.stats.personMoved(state.timeNow, "elevator", null);
            }
        });
    }
    
    static ExitWork(person, floor) {
        return new Event(TRANSLATIONS.events.exitWork(person, floor), state => {
            state.offices[floor].remove_if(p => p === person);
            person.destFloor = 0;
            state.eventQueue.push(state.timeNow, Event.EnterFloor(person, floor));
            state.stats.personMoved(state.timeNow, "work", null);
        });
    }
    
    
    static ElevatorAwake(elevator) {
        return new Event(TRANSLATIONS.events.elevatorAwake(elevator), state => {
            // If trying to awake an already awaken elevator, do nothing
            if (elevator.sleeping === false) return;

            elevator.sleeping = false;
            elevator.direction = "any";
            // if people waiting at the current floor, do a stop at this floor
            if (state.floorQueues[elevator.floor].length > 0)
                return state.eventQueue.push(state.timeNow, Event.ElevatorBeginStop(elevator));
            // Else, go to next objective
            pushNextElevatorEvent(state, elevator);
        });
    }
    
    static ElevatorArrival(elevator, floor) {
        return new Event(TRANSLATIONS.events.elevatorArrival(elevator, floor), state => {
            elevator.floor = floor;
            // if no one in the elevator, let's accept any person regardless of their destination
            if (elevator.people.length === 0) elevator.direction = "any";
            if (state.shouldElevatorStops(elevator))
                return state.eventQueue.push(state.timeNow, Event.ElevatorBeginStop(elevator));
            
            pushNextElevatorEvent(state, elevator);
        });
    }
    
    static ElevatorBeginStop(elevator) {
        return new Event(TRANSLATIONS.events.elevatorBeginStop(elevator), state => {
            elevator.stopped = true;
            
            // First, people will exit the elevator
            let nbSlots = state.C - elevator.people.length;
            for (let person of elevator.people) {
                if (person.destFloor === elevator.floor) {
                    ++nbSlots;
                    state.eventQueue.push(state.timeNow, Event.ExitElevator(person, elevator));
                }
            }

            if (elevator.floor === state.F - 1 || elevator.floor === 0 || elevator.people.length === 0)
                elevator.direction = "any";

            // Then, people will enter the elevator
            // We must make sure to not let enter more peple than the capacity of the elevator.
            for (let entry of state.floorQueues[elevator.floor].entries) {
                if (nbSlots < 1) break;
                if (state.canEnter(entry.elem, elevator.floor, elevator)) {
                    --nbSlots;
                    entry.elem.handled = true;
                    state.eventQueue.push(state.timeNow, Event.EnterElevator(entry.elem, elevator));
                }
            }
            
            state.eventQueue.push(state.timeNow + Parameters.elevatorWait, Event.ElevatorEndStop(elevator));
        });
    }
    
    static ElevatorEndStop(elevator) {
        return new Event(TRANSLATIONS.events.elevatorEndStop(elevator), state => {
            elevator.stopped = false;
            pushNextElevatorEvent(state, elevator);
        });
    }
    
    static ElevatorSleep(elevator) {
        return new Event(TRANSLATIONS.events.elevatorSleep(elevator), state => {
            elevator.sleeping = true;
            elevator.direction = "any";
        });
    }
    
};