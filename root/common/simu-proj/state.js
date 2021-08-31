//============   PARAMETERS   ============


const AllInputs = document.getElementsByTagName("input");
const LegendsFromInputNames = function(){
    const dict = {};
    for (const label of document.getElementsByTagName("label"))
        dict[label.htmlFor] = label.textContent;
    return dict;
}();

for (let input of AllInputs)
    if (input.type === "checkbox")
        input.checked = false;

const Parameters = {
    errorMessages: [],
    
    Load() {
        this.errorMessages = [];
        for (const input of AllInputs) {
            const errorMessageStart = LegendsFromInputNames[input.name] + " : ";
            if (input.validationMessage !== "")
                this.errorMessages.push(errorMessageStart + input.validationMessage);
            else if (input.value === "")
                this.errorMessages.push(errorMessageStart + TRANSLATIONS.emptyValue);

            
            if (input.type === "checkbox") {
                this[input.name] = input.checked;
            } else if (input.type === "radio") {
                if (input.checked) this[input.name] = input.value;
            }
            else {
                this[input.name] = (input.type === "number" ? Number(input.value) : input.value);
            }
        }
    },
}
Parameters.Load();

// Ensures parameters are reloaded when user changes them.
for (const input of AllInputs)
    input.addEventListener("input", () => Parameters.Load());


// A Person has an 'id' and an 'icon' (random emoji).
// 'person.destFloor' must be set by outer code.
class Person {
    constructor() {
        Person._globalId++;
        this.id = Person._globalId;
        // emoji is "(man|woman) + [skinColor] + zero-width-joiner + modifier"
        this.icon = Random.pick_element(Person._iconBases) + Random.pick_element(Person._colorTones)
                    + "\u{200d}" + Random.pick_element(Person._modifiers);
        // must be set 
        this.destFloor = null;
        this.handled = false;
    };
    
    html() {
        if (this.destFloor !== null)
            return `<span title="Id #${this.id}\ndestFloor=${this.destFloor}">${this.icon}</span>`;
        else
            return `<span title="Id #${this.id}">${this.icon}</span>`;
    }
    
    static _globalId = 0;
    static _iconBases = ["👨", "👩" ];
    static _colorTones = ["", "\u{1f3fb}", "\u{1f3fc}", "\u{1f3fd}", "\u{1f3fe}", "\u{1f3ff}", ];
    static _modifiers = [ "🦰", "🦱", "🦳", "🦲", "⚕️", "🎓", "🏫", "🌾", "🍳", "🔧", "🏭", "💼", "🔬", "💻", "✈️", "🚒", "🚀", "🎨", "🎤" ];
};

class Elevator {
    // NOTE: the elevator can move even if direction === "rest".
    // This is the case when its rest policy makes it go to a specific floor.
    // Moving while resting has the lowest priority
    constructor(id) {
        this.id = id;
        this.floor = 0;          // current floor
        this.direction = "any"; // either "up", "down" or "any"
        this.people = [];        // elements are instances of Person
        this.stopped = true;
        this.sleeping = true;
    };
    
    // Returns "up", "down" or undefined, based ONLY on the people INSIDE the elevator.
    // Supposes no one wants to quit the elevator at the current floor.
    nextObjective() {
        if (this.people.length === 0) return undefined; 
        const peopleObjectives = this.people.map(p => (p.destFloor > this.floor ? "up" : "down"));
        // maintain same direction if needed
        if (Parameters.scheduling === "LinearScan" && peopleObjectives.includes(this.direction))
            return this.direction;
        else
            return peopleObjectives[0];
    }
};

class State {
    constructor() {
        // N, F and C cannot be modified during simulation.
        this.N = Parameters.N;
        this.F = Parameters.F;
        this.C = Parameters.C;
        // All durations stored in the simulation are in seconds.
        // Timestamps are stored as seconds since start of simulation.
        // 'timeNow' stores the current timestamp.
        this.timeNow = 0;
        // Events are ordered by the timestamp at which they must be called.
        this.eventQueue = new PriorityQueue();
        // [0] is first floor, [Parameters.F-1] is last floor.
        // Each floor has a priority queue, in which people are ordered according to their arrival time.
        // (first in, first out)
        this.floorQueues = [];
        for (let i = 0; i < this.F; ++i) this.floorQueues.push(new PriorityQueue());
        // Contain working people, in no particular order.
        // Actually not required for the simulation logic, but needed to render
        // which person is working at which floor.
        // NOTE: offices[0] will always be empty, because there is no offices at first floor.
        this.offices = [];
        for (let i = 0; i < this.F; ++i) this.offices.push([]);
        
        this.elevators = [];
        for (let i = 0; i < this.N; ++i) this.elevators.push(new Elevator(i));

        this.previousEvents = [];

        this.stats = new Stats(this);
    };
    
    // checking if this person at this floor can enter this elevator
    canEnter(person, floor, elevator) {
        const person_direction = person.destFloor > floor ? "up" : "down";
        return floor === elevator.floor && (elevator.stopped || elevator.sleeping)
            && elevator.people.length < this.C
            && !person.handled
            && [person_direction, "any"].includes(elevator.direction);
    }

    getFirstWaitingFloor() {
        let currentWaitingSince = +Infinity;
        let currentFloor = undefined;

        for (let f = 0; f < this.F; ++f) {
            let waitingSince = Math.min(...this.floorQueues[f].entries.map(entry => entry.elem._waitingSince));
            if (waitingSince !== undefined && waitingSince < currentWaitingSince) {
                currentWaitingSince = waitingSince;
                currentFloor = f;
            }
        }
        return currentFloor;
    }
    
    // Returns either "up", "down" or undefined.
    nextElevatorObjective(elevator) {
        // first, check what people inside the elevator wants
        const elevatorObjective = elevator.nextObjective();
        if (elevatorObjective !== undefined) return elevatorObjective;
        
        if (Parameters.scheduling === "FCFS") {
            // going to queue with the person waiting for the most time
            let floor = this.getFirstWaitingFloor();
            if (floor === undefined) return undefined;
            else return floor > elevator.floor ? "up" : "down";
        }
        else {
            // Linear scan
            const busyFloors = this.floorQueues.flatMap((q, floor) => (q.entries.length > 0 ? floor : []));
            if (busyFloors.length === 0) {
                if (Parameters.rest === "MiddleFloor") {
                    const dest = Math.floor(this.F / 2);
                    if (dest > elevator.floor) return "up";
                    else if (dest < elevator.floor) return "down";
                }
                return undefined;
            }

            const nearestFloor = { up:   busyFloors.filter(f => f > elevator.floor)[0],
                                down: busyFloors.filter(f => f < elevator.floor)[0] };
            if (nearestFloor.up === undefined && nearestFloor.down === undefined) return undefined;
            if (nearestFloor.up !== undefined && nearestFloor.down === undefined) return "up";
            if (nearestFloor.up === undefined && nearestFloor.down !== undefined) return "down";

            return elevator.direction;
        }
    }
    
    shouldElevatorStops(elevator) {
        // check if someone in the elevator wants to quit.
        if (elevator.people.some(p => p.destFloor === elevator.floor)) return true;
        // check if elevator is full.
        if (elevator.people.length === this.C) return false;
        
        if (Parameters.scheduling === "LinearScan") {
            // check if someone wants to enter
            for (let entry of this.floorQueues[elevator.floor].entries) {
                const person_direction = entry.elem.destFloor > elevator.floor ? "up" : "down";
                if ([person_direction, "any"].includes(elevator.direction))
                    return true;
            }
            return false;
        } else {
            // First Come First Serve
            return this.getFirstWaitingFloor() === elevator.floor;
        }
    }
    
    advance() {
        if (Parameters.errorMessages.length > 0) {
            alert(`${TRANSLATIONS.invalidParameters}\n- ${Parameters.errorMessages.join("\n- ")}`);
            return;
        }
        const nextEvent = this.eventQueue.pop();
        if (nextEvent === undefined) return;
        this.timeNow = nextEvent.priority;
        nextEvent.elem.run(this);
        this.previousEvents.unshift({t: nextEvent.priority, text: nextEvent.elem.text});
    }
};
