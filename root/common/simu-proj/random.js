// Utility functions to wrap Math.random()
const Random = {
    uniform_real(min, max) { return Math.random() * (max-min) + min; },
    uniform_int(min, max) { return Math.floor(Random.uniform_real(min, max)); },
    pick_element(array) { return array[Math.floor(Math.random() * array.length)]; },

    exponential(lambda) {
        // Exponential CDF is F(x): "y = 1 - exp(-lambda*x)"" ( [0;+inf[ -> [0;1[ )
        // Its inverse is F^-1(x): "x = -ln(1-y)/lambda" ( [0;1[ -> [0;+inf[ )
        const y = Math.random();
        return -Math.log(1-y) / lambda;
    }
};