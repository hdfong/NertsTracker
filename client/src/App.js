import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./components/Landing";
//import Lobby from "./components/Lobby";

import "bootstrap/dist/css/bootstrap.min.css";

import "./App.css";

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className='App'>
          <Navbar />
          <Switch>
            <Route exact path='/' component={Landing} />
            {/* <Route path='/lobby' component={Lobby} /> */}
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
