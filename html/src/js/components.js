'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import CSSTransitionGroup from 'react-addons-css-transition-group';

class Dic {
  constructor() {
    this.ref = new Firebase('https://teamgpt.firebaseio.com');
    this.columnNames = {
      aizu: 'Aizu',
      tokyo: 'Tokyo'
    };
  }
  getOppositeColumnName(columnName) {
    return (columnName == this.columnNames.aizu ? this.columnNames.tokyo : this.columnNames.aizu);
  }
  getAllAizuList() {
    return new Promise((resolve, reject) => {
      this.ref.on('value', (snapshot) => {
        resolve(snapshot.val());
      }, (error) => {
        reject(error);
      });
    }).then((dics) =>
      Object.keys(dics).map((key) =>
        dics[key][this.columnNames.aizu]
      )
    ).catch((error) => {
      console.log(error);
    });
  }
  toBy(distColumnName, originalWord) { // private method
    return new Promise((resolve, reject) => {
      this.ref.orderByChild(distColumnName).equalTo(tokyo).on('value', (snapshot) => {
        resolve(snapshot.val());
      }, (error) => {
        reject(error);
      });
    }).then((dics) =>
      (dics == null ? null : dics[Object.keys(dics)[0]][getOppositeColumnName(distColumnName)])
    ).catch((error) => {
      console.log(error);
    });
  }
  toAizu(tokyo) {
    return toBy(this.columnNames.aizu, tokyo);
  }
  toTokyo(aizu) {
    return toBy(this.columnNames.tokyo, aizu);
  }
}

let dic = new Dic;
let allAizuListReadyPromise = dic.getAllAizuList();

let ALMemoryReadyPromise = new Promise((resolve, reject) => {
  if(window.QiSession == undefined) {
    reject();
  } else {
    let qisession = new QiSession();
    qisession.service('ALMemory').done((ALMemory) => {
      resolve(ALMemory);
    });
  }
});

Promise.all([ALMemoryReadyPromise, allAizuListReadyPromise]).then((solvers) => {
  let ALMemory = solvers[0];
  let allAizuList = solvers[1];
  ALMemory.raiseEvent('myapp/dic', allAizuList);
});

ALMemoryReadyPromise.then((ALMemory) => {
  ALMemory.subscriber('myapp/pullheard').done((subscriber) => {
    subscriber.signal.connect((saidStr) => {
      dic.toAizu(saidStr).then((tokyo) => {
        // TODO: fix python script because the argument type was changed
        ALMemory.raiseEvent('myapp/pullfound', tokyo);
      });
    });
  });
});


// Follows: Tablet UI Components

const PAGE = {
  TOP: 0
};

let documentReadyPromise = new Promise((resolve, reject) => {
  if(document.readyState == 'complete') resolve();
  document.addEventListener('DOMContentLoaded', () => {
    resolve();
  });
});

function makeHashLikeStr(str) {
  return encodeURIComponent(str).split('%').join('');
}

class AizuList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      aizuList: []
    };
    allAizuListReadyPromise.then((aizuList) => {
      this.setState({
        aizuList: aizuList
      });
    });
  }
  makeAizuClickHandler(aizu) {
    return (() => {
      this.props.onAizuClick(aizu);
    });
  }
  render() {
    let aizuListElements = this.state.aizuList.map((aizu) => {
      return (
        <li onClick={this.makeAizuClickHandler(aizu).bind(this)} key={makeHashLikeStr(aizu)}>
          <span className="aizu">{aizu}</span>
        </li>
        // <button className="btn btn-danger" onClick={this.makeAizuClickHandler(aizu).bind(this)} key={makeHashLikeStr(aizu)}>
        //   {aizu}
        // </button>
      );
    });
    return (
      <div className="aizu-list">
        <ul>{aizuListElements}</ul>
      </div>
      // <div id="qa" className="wrapper">
      //   <div className="a4_2">
      //     {aizuListElements}
      //   </div>
      // </div>
    );
  }
}

class AizuListPage extends React.Component {
  handleAizuClick(aizu) {
    console.log(aizu);// PASS
    ALMemoryReadyPromise.then((ALMemory) => {
      ALMemory.raiseEvent('myapp/aizuSelect', aizu);
    });
  }
  render() {
    return (
      <div className="aizu-list-page">
        <AizuList onAizuClick={this.handleAizuClick.bind(this)} />
      </div>
    );
  }
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: (<AizuListPage />)
    }
    this.pages = {};
    this.pages[PAGE.AIZULIST] = (<AizuListPage />);
  }
  switchTo(pageLabel) {
    this.setState({
      currentPage: this.pages[pageLabel]
    });
  }
  render() {
    return this.state.currentPage;
  }
}

documentReadyPromise.then(() => {
  ReactDOM.render(
    (
      <Page />
    ),
    document.querySelector('.page-container')
  );
});