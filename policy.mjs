// Privacy state machine. A missing client is never treated as invisible.
export class Policy {
  constructor(initialTarget = null) {
    this.target = initialTarget;
    this.startup = true;
    this.last = { steam: null, discord: null };
    this.pending = {};
    this.failed = {};
    this.force = new Set(initialTarget === true ? ['discord'] : []);
  }
  request(invisible) {
    this.startup = false;
    this.command = true;
    this.target = invisible;
    this.pending = {};
    this.failed = {};
    this.force = new Set(['steam', 'discord']);
  }
  observe(states, now = Date.now()) {
    const changed = [];
    const errors = [];
    for (const name of ['steam', 'discord']) {
      const value = states[name];
      if (value === null) { this.last[name] = null; delete this.pending[name]; continue; }
      if (name === 'discord' && this.last[name] === null && value === true && this.target === true) this.force.add('discord');
      const pending = this.pending[name];
      if (pending) {
        if (value === pending.target) {
          delete this.pending[name];
          this.last[name] = value;
          continue; // confirmation, not a new user change
        }
        if (now < pending.deadline) continue;
        errors.push(`${name} did not confirm its status change`);
        delete this.pending[name];
        this.failed[name] = true;
        this.last[name] = value;
        continue;
      }
      if (!this.command && this.last[name] !== null && this.last[name] !== value) changed.push(value);
      if (this.last[name] !== value) delete this.failed[name];
      this.last[name] = value;
    }
    this.command = false;
    if (this.startup && Object.values(states).some(v => v !== null)) {
      this.startup = false;
      if (Object.values(states).some(v => v === true)) {
        this.target = true;
        this.force.add('discord');
      }
    }
    if (this.target === null) {
      const available = Object.values(states).filter(v => v !== null);
      if (available.length) {
        this.target = available.some(Boolean);
        if (this.target) this.force.add('discord'); // normalize timed invisibility to Forever
      }
    } else if (changed.length) {
      // When both change in the same poll, invisible wins.
      this.target = changed.some(Boolean);
      this.failed = {};
      if (this.target) this.force.add('discord');
    }
    const actions = [];
    if (this.target !== null) {
      for (const name of ['steam', 'discord']) {
        if (states[name] === null || this.pending[name] || this.failed[name]) continue;
        if (states[name] !== this.target || this.force.has(name)) {
          actions.push({ name, invisible: this.target });
          this.pending[name] = { target: this.target, deadline: now + 20000 };
          this.force.delete(name);
        }
      }
    }
    return { actions, errors };
  }
  retry(name) {
    delete this.pending[name];
    this.failed[name] = true;
  }
}
