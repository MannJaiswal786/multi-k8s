import React, { Component } from 'react';
import axios from 'axios';

class Fib extends Component {
  state = {
    seenIndexes: [],
    values: {},
    index: ''
  };

  async componentDidMount() {
    await Promise.all([this.fetchValues(), this.fetchIndexes()]);
  }

  fetchValues = async () => {
    const res = await axios.get('/api/values/current');
    this.setState({ values: res.data || {} });
  };

  fetchIndexes = async () => {
    const res = await axios.get('/api/values/all');
    // expect [{ number: 5 }, { number: 7 }, ...]
    this.setState({ seenIndexes: Array.isArray(res.data) ? res.data : [] });
  };

  handleSubmit = async (event) => {
    event.preventDefault();

    // normalize & validate
    const n = parseInt(this.state.index, 10);
    if (!Number.isInteger(n)) {
      alert('Please enter an integer.');
      return;
    }
    if (n < 0) {
      alert('Index must be >= 0');
      return;
    }
    if (n > 40) {
      alert('Index too high (<= 40 recommended).');
      return;
    }

    try {
      await axios.post('/api/values', { index: n });
      // refresh lists so the UI updates immediately
      await Promise.all([this.fetchValues(), this.fetchIndexes()]);
      this.setState({ index: '' });
    } catch (err) {
      console.error(err);
      alert('Submit failed. Check server logs.');
    }
  };

  renderSeenIndexes() {
    return this.state.seenIndexes.map(({ number }) => number).join(', ');
  }

  renderValues() {
    const entries = [];
    for (let key in this.state.values) {
      entries.push(
        <div key={key}>
          For index {key} I calculated {this.state.values[key]}
        </div>
      );
    }
    return entries;
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <label>Enter your Index:</label>
          <input
            type="number"
            min="0"
            max="40"
            value={this.state.index}
            onChange={(e) => this.setState({ index: e.target.value })}
          />
          <button disabled={this.state.index === ''}>Submit</button>
        </form>

        <h3>Indexes I have seen:</h3>
        {this.renderSeenIndexes()}

        <h3>Calculated Values:</h3>
        {this.renderValues()}
      </div>
    );
  }
}

export default Fib;
