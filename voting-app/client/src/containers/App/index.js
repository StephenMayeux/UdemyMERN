// Because of stupid reasons:
// eslint-disable-next-line
import React, { Component } from 'react';
import './style.css';

import Header from '../../components/Header'

class App extends Component {
  render() {
    return (
      <div>
        <Header />
        {this.props.children}
      </div>
    );
  }
}

export default App;
