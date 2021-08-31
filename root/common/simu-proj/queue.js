
// adding remove_if method to Array. Returns number of elements removed
Array.prototype.remove_if = function(predicate) {
    let nb_removed = 0;
    for (let i = this.length - 1; i >= 0; --i)
        if (predicate(this[i])) {
            this.splice(i, 1);
            ++nb_removed;
        }
    return nb_removed;
}


function removeValue(array, value) { array.splice(array.indexOf(value), 1); }



// Implementation of a priority queue, which will be used both for event queue and elevator queues.
// Each element has a priority (lowest value means bigger priority).
class PriorityQueue {
    // An element of the priority queue
    static Element = class {
        constructor(priority, elem) { this.priority = priority; this.elem = elem; };
    };
    
    constructor() { this.entries = []; };
    
    push(priority, element) {
        // find where the priority must be added
        // IMPORTANT: in case of equality, the new value will be AFTER the other value
        let i = 0;
        for (const elem of this.entries) {
            if (priority < elem.priority) break;
            ++i;
        }
        this.entries.splice(i, 0, new PriorityQueue.Element(priority, element));
    };
    
    pop() {
        return this.entries.shift();
    };
    
    get length() { return this.entries.length; };
};