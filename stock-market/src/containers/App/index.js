import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Grid, Row, Col } from 'react-bootstrap'
import io from 'socket.io-client'
import _ from 'lodash'

import LineChart from '../../components/LineChart'
import TickerCard from '../../components/TickerCard'
import AddStockCard from '../../components/AddStockCard'
import { actionCreators as actions } from '../../actions'

import './style.css'

const socket = io.connect()

class App extends Component {
  constructor(props) {
    super(props)

    this.handleDelete = this.handleDelete.bind(this)
  }

  componentDidMount() {
    socket.on('init', this.props.actions.updateStocks)
    socket.on('deleteStock', this.props.actions.deleteTicker)
    socket.on('newStock', this.props.actions.addNewStock)
  }

  handleDelete(ticker) {
    this.props.actions.deleteTicker({ ticker })
    socket.emit('deleteTicker', { ticker })
  }

  renderChart() {
    if (this.props.stocks.tickers.length) {
      return (
        <LineChart
          chartData={this.props.stocks.chartData}
          tickers={this.props.stocks.tickers}
        />
      )
    }
    return <h2>Loading Data...</h2>
  }

  renderTickerCards() {
    const mostRecentPrices = _.last(this.props.stocks.chartData)

    return this.props.stocks.tickers.map(ticker => {
      return (
        <Col xs={4} key={ticker}>
          <TickerCard
            mostRecentClosePrice={mostRecentPrices[ticker]}
            ticker={ticker}
            handleDelete={this.handleDelete}
          />
        </Col>
      )
    })
  }

  render() {
    return (
      <Grid>
        <Row>
          <Col xs={12}>
            <h1 style={{ textAlign: "center" }}>Stock Market App</h1>
            {this.renderChart()}
          </Col>
        </Row>
        <Row>
          <Col xs={4}>
            <AddStockCard
              tickers={this.props.stocks.tickers}
              displayMessage={this.props.actions.displayMessage}
              socket={socket}
              errorMessage={this.props.messages.error}
            />
          </Col>
          {this.renderTickerCards()}
        </Row>
      </Grid>
    )
  }
}

const mapStateToProps = ({ stocks, messages }) => {
  return { stocks, messages }
}

const mapDispatchToProps = (dispatch) => {
  return { actions: bindActionCreators(actions, dispatch) }
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
