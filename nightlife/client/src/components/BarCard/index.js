import React from 'react'
import {
  Thumbnail,
  Button,
  Col,
  Label
} from 'react-bootstrap'

import './style.css'

const BarCard = (props) => {
  const { image_url, name, isLoggedIn, visitors } = props
  return (
    <Col xs={4}>
      <Thumbnail src={image_url}>
        <h3>{name}</h3>
        {isLoggedIn
          ? <span style={{ marginRight: 20 }}><Button bsStyle="primary">Check In</Button></span>
          : <span></span>
        }
        <span>
          <Label>{`${visitors.length} people are going`}</Label>
        </span>
      </Thumbnail>
    </Col>
  )
}

export default BarCard
