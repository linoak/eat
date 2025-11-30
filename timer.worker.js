self.onmessage = function (e) {
    if (e.data === 'start') {
        setInterval(() => {
            self.postMessage('tick');
        }, 1000); // Check every second for more precision, or keep 60000 if minute-level is enough. 
        // Given the requirement for "background execution", 1000-5000ms is better to ensure we don't miss a minute transition if the main thread is throttled.
        // Let's stick to checking every 5 seconds to be safe and efficient.
    }
};

setInterval(() => {
    self.postMessage('tick');
}, 5000);
