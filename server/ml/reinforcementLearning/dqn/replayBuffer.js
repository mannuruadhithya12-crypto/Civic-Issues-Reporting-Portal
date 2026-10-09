class ReplayBuffer {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.position = 0;
    }

    add(experience) {
        // experience = { state, action, reward, nextState, done, actionMask, nextActionMask, metadata }
        if (this.buffer.length < this.maxSize) {
            this.buffer.push(experience);
        } else {
            this.buffer[this.position] = experience;
        }
        this.position = (this.position + 1) % this.maxSize;
    }

    sample(batchSize) {
        const batch = [];
        // Reservoir sampling or simple random sampling
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * this.buffer.length);
            batch.push(this.buffer[index]);
        }
        return batch;
    }

    size() {
        return this.buffer.length;
    }

    clear() {
        this.buffer = [];
        this.position = 0;
    }
}

module.exports = ReplayBuffer;
