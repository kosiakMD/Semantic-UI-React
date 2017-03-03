import _ from 'lodash'
import React, { Component, PropTypes } from 'react'

import { Header, Icon, Popup, Table } from 'src'
import { SUI } from 'src/lib'

const extraDescriptionStyle = {
  color: '#666',
}
const extraDescriptionContentStyle = {
  marginLeft: '0.5em',
}

const Extra = ({ title, children, inline, ...rest }) => (
  <div {...rest} style={extraDescriptionStyle}>
    <strong>{title}</strong>
    <div style={{ ...extraDescriptionContentStyle, display: inline ? 'inline' : 'block' }}>
      {children}
    </div>
  </div>
)
Extra.propTypes = {
  children: PropTypes.node,
  inline: PropTypes.bool,
  title: PropTypes.node,
}

/**
 * Displays a table of a Component's PropTypes.
 */
export default class ComponentProps extends Component {
  static propTypes = {
    /**
     * A single Component's prop info as generated by react-docgen.
     * @type {object} Props info object where keys are prop names and values are prop definitions.
     */
    props: PropTypes.object,
    /**
     * A single Component's meta info.
     * @type {object} Meta info object where enum prop values are defined.
     */
    meta: PropTypes.object,
  }

  state = {
    showEnumsFor: {},
  }

  toggleEnumsFor = (prop) => () => {
    this.setState({
      showEnumsFor: {
        ...this.state.showEnumsFor,
        [prop]: !this.state.showEnumsFor[prop],
      },
    })
  }

  renderName = item => <code>{item.name}</code>

  renderRequired = item => item.required && (
    <Popup
      position='right center'
      style={{ padding: '0.5em' }}
      trigger={<Icon size='small' color='red' name='asterisk' />}
      content='Required'
      size='tiny'
      inverted
    />
  )

  renderDefaultValue = item => {
    const defaultValue = _.get(item, 'defaultValue.value')
    if (_.isNil(defaultValue)) return null

    const defaultIsString = defaultValue[0] === "'"

    return <code>{defaultIsString ? `=${defaultValue}` : `={${defaultValue}}`}</code>
  }

  renderFunctionSignature = (item) => {
    if (item.type !== '{func}') return

    const params = _.filter(item.tags, { title: 'param' })
    const paramSignature = params
      .map(param => `${param.name}: ${param.type.name}`)
      // prevent object properties from showing as individual params
      .filter(p => !p.includes('.'))
      .join(', ')

    const paramDescriptionRows = params.map(param => (
      <div key={param.name} style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: '2 2 0', padding: '0.1em 0' }}>
          <code>{param.name}</code>
        </div>
        <div style={{ flex: '5 5 0', padding: '0.1em 0' }}>
          {param.description}
        </div>
      </div>
    ))

    return (
      <Extra title={<pre>{item.name}({paramSignature})</pre>}>
        {paramDescriptionRows}
      </Extra>
    )
  }

  expandEnums = (value) => {
    const parts = value.split('.')
    if (parts[0] === 'SUI') {
      return SUI[parts[1]]
    }
    return value
  }

  renderEnums = (item) => {
    if (item.type !== '{enum}') return

    const { showEnumsFor } = this.state
    const truncateAt = 10

    if (!item.value) return null

    const values = [].concat(item.value).reduce((accumulator, v) => {
      return accumulator.concat(this.expandEnums(_.trim(v.value || v, '.\'')))
    }, [])

    const valueElements = _.map(values, val => <span key={val}><code>{val}</code> </span>)

    // show all if there are few
    if (values.length < truncateAt) {
      return (
        <Extra title='Enums:' inline>
          {valueElements}
        </Extra>
      )
    }

    // add button to show more when there are many values and it is not toggled
    if (!showEnumsFor[item.name]) {
      return (
        <Extra title='Enums:' inline>
          <a style={{ cursor: 'pointer' }} onClick={this.toggleEnumsFor(item.name)}>
            Show all {values.length}
          </a>
          <div>{valueElements.slice(0, truncateAt - 1)}...</div>
        </Extra>
      )
    }

    // add "show more" button when there are many
    return (
      <Extra title='Enums:' inline>
        <a style={{ cursor: 'pointer' }} onClick={this.toggleEnumsFor(item.name)}>
          Show less
        </a>
        <div>{valueElements}</div>
      </Extra>
    )
  }

  renderRow = item => {
    return (
      <Table.Row key={item.name}>
        <Table.Cell>{this.renderName(item)}{this.renderRequired(item)}</Table.Cell>
        <Table.Cell>{this.renderDefaultValue(item)}</Table.Cell>
        <Table.Cell>{item.type}</Table.Cell>
        <Table.Cell>
          {item.description && <p>{item.description}</p>}
          {this.renderFunctionSignature(item)}
          {this.renderEnums(item)}
        </Table.Cell>
      </Table.Row>
    )
  }

  render() {
    const { props: propsDefinition } = this.props

    const content = _.sortBy(_.map(propsDefinition, (config, name) => {
      const value = _.get(config, 'type.value')
      let type = _.get(config, 'type.name')
      if (type === 'union') {
        type = _.map(value, (val) => val.name).join('|')
      }
      type = type && `{${type}}`

      const description = _.get(config, 'docBlock.description', '')

      return {
        name,
        type,
        value,
        tags: _.get(config, 'docBlock.tags'),
        required: config.required,
        defaultValue: config.defaultValue,
        description: description && description.split('\n').map(l => ([l, <br key={l} />])),
      }
    }), 'name')

    return (
      <Table compact='very' basic='very'>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Default</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Description</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {_.map(content, this.renderRow)}
        </Table.Body>
      </Table>
    )
  }
}
