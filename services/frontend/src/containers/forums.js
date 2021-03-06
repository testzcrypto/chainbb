import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { goToTop } from 'react-scrollable-anchor'
import NumericLabel from '../utils/NumericLabel'
import TimeAgo from 'react-timeago'

import { Button, Dimmer, Divider, Loader, Grid, Header, Segment  } from 'semantic-ui-react'

import * as GLOBAL from '../global';
import * as accountActions from '../actions/accountActions'
import * as breadcrumbActions from '../actions/breadcrumbActions'
import * as postActions from '../actions/postActions'
import * as statusActions from '../actions/statusActions'
import * as preferenceActions from '../actions/preferenceActions'

import ForumLink from '../utils/forumlink'
import AccountLink from '../components/elements/account/link'
import UserAvatar from '../components/elements/account/avatar'
import Login from '../components/elements/login'

class Forums extends React.Component {

    constructor(props, state) {
      goToTop()
      super(props);
      this.state = {
        group: false,
        minimized: props.preferences.forums_minimized || [],
        forums: []
      };
      this.getForums = this.getForums.bind(this);
    }

    componentDidMount() {
      this.props.actions.setBreadcrumb([])
    }

    componentWillMount() {
      this.props.actions.resetPostState()
    }

    toggleVisibility = (e, props) => {
      const forum = props.value;
      let { minimized } = this.state;
      if(minimized.indexOf(forum) !== -1) {
        const index = minimized.indexOf(forum);
        minimized.splice(index, 1);
      } else {
        minimized.push(forum);
      }
      this.props.actions.setPreference({ 'forums_minimized': minimized });
      this.setState({ minimized });
    }

    async getForums() {
      try {
        let uri = GLOBAL.REST_API;
        if(this.props.forums && this.props.forums.group) {
          uri = uri + '/' + this.props.forums.group;
        }
        const response = await fetch(uri);
        if (response.ok) {
          const result = await response.json();
          this.setState({
            forums: result.data.forums,
            users: result.data.users,
            group: this.props.forums.group
          });
          this.props.actions.setStatus({'network': result.network});
        } else {
          console.error(response.status);
        }
      } catch(e) {
        console.error(e);
      }
    }

    render() {
      let loaded = (this.state.forums.length > 0),
          loader = {
            style:{
              minHeight: '100px',
              display: 'block'
            },
            content: 'Loading'
          },
          activeusers = false,
          display = <Dimmer active inverted style={loader.style}>
                      <Loader size='large' content={loader.content}/>
                    </Dimmer>
      if(this.props.forums.group !== this.state.group) {
        this.props.actions.resetPostState()
        this.getForums()
      }
      if(loaded) {
        let { forums, users } = this.state,
            // Find the unique forum groupings
            groups = forums.map((forum, index) => {
              return (!this.state.forums[index-1] || this.state.forums[index-1].group !== forum.group) ? forum['group'] : null
            }).filter(function(name) {
              return name !== null
            })

        activeusers = (
          <Segment>
            <Header size='large'>
              Active Users (Posting)
              <Header.Subheader>
                {' '}<strong>{users.stats.chainbb}</strong>{' '}
                users have posted on chainBB, with
                {' '}<strong>{users.stats.total}</strong>{' '}
                users total posting on the Steem network in the last 24 hours.
              </Header.Subheader>
            </Header>
            <Divider horizontal>
              Recent chainBB users
            </Divider>
            {users.list.map((user, i) => <span key={i}>
              {!!i && ", "}
              <AccountLink username={user['_id']} />
            </span>)}
          </Segment>
        )
        display = groups.map((group) => {
          const isMinimized = this.state.minimized.indexOf(group) >= 0
          let groupings = forums.filter(function(forum) {
            return forum['group'] === group
          }).map((forum, index) => {
            let lastPost = (forum.last_post) ? (new Date(forum.last_post['created']).getTime()) : 0,
                lastReply = (forum.last_reply) ? (new Date(forum.last_reply['created']).getTime()) : 0,
                newest = (lastPost > lastReply) ? 'last_post' : 'last_reply',
                { author, url, created, title } = (typeof forum[newest] === 'object') ? forum[newest] : {},
                latest_post = null,
                numberFormat = {
                  shortFormat: true,
                  shortFormatMinValue: 1000
                }
            if(title && title.length > 100) {
              title = title.substring(0, 100) + " ..."
            }
            if(author) {
              latest_post = <Header size='tiny'>
                              <UserAvatar username={author} />
                              <Link
                                to={`${url.split("#")[0]}`}
                                style={{
                                  display: 'block',
                                  maxHeight: '35px',
                                  overflow: 'hidden'
                                }}>
                                {title}
                              </Link>
                              <Header.Subheader>
                                {'↳ '}
                                <Link to={`${url}`}>
                                  <TimeAgo date={`${created}Z`} />
                                </Link>
                              </Header.Subheader>
                            </Header>
            }
            // (this.state.forums[index-1]) && this.state.forums[index-1].group != forum.group
            return (
              <Segment
                attached key={forum._id}
                style={{ display: isMinimized ? "none" : "" }}
                >
                <Grid>
                  <Grid.Row
                    verticalAlign='middle'
                    >
                    <Grid.Column computer={7} tablet={7} mobile={8}>
                      <Header size='medium'>
                        <ForumLink forum={forum}/>
                        <Header.Subheader style={{marginTop: '0.1rem'}}>
                          {
                            (forum.description)
                              ? <p>{'↳ '}{forum.description}</p>
                              : ''
                          }
                        </Header.Subheader>
                      </Header>
                    </Grid.Column>
                    <Grid.Column width={2} only='large screen' textAlign='center'>
                      <Header size='medium'>
                        <NumericLabel params={numberFormat}>{(forum.stats) ? forum.stats.posts : '?'}</NumericLabel>
                      </Header>
                    </Grid.Column>
                    <Grid.Column width={2} only='large screen' textAlign='center'>
                      <Header size='medium'>
                        <NumericLabel params={numberFormat}>{(forum.stats) ? forum.stats.replies : '?'}</NumericLabel>
                      </Header>
                    </Grid.Column>
                    <Grid.Column computer={5} tablet={5} mobile={8}>
                      {latest_post}
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Segment>
            )
          })
          return  <div key={group} style={{marginBottom: "10px"}}>
                    <Segment secondary attached>
                      <Grid>
                        <Grid.Row verticalAlign="middle">
                          <Grid.Column computer={1} tablet={1} mobile={3}>
                            <Button
                              basic
                              onClick={this.toggleVisibility}
                              value={group}
                              icon={isMinimized ? "plus" : "minus"}
                              size="small"
                            />
                          </Grid.Column>
                          <Grid.Column computer={6} tablet={6} mobile={13}>
                            <Header>
                              {group}
                            </Header>
                          </Grid.Column>
                          <Grid.Column width={2} only='large screen' textAlign='center'>
                            <Header size='tiny' style={{ display: isMinimized ? "none" : "" }}>
                              Posts
                            </Header>
                          </Grid.Column>
                          <Grid.Column width={2} only='large screen'>
                            <Header size='tiny' textAlign='center' style={{ display: isMinimized ? "none" : "" }}>
                              Replies
                            </Header>
                          </Grid.Column>
                          <Grid.Column width={5}  only='large screen' style={{ display: isMinimized ? "none" : "" }}>
                            <Header size='tiny'>
                              Recently Active
                            </Header>
                          </Grid.Column>
                        </Grid.Row>
                      </Grid>
                    </Segment>
                    {groupings}
                  </div>
        })
      }
      return(
        <div>
          <Grid style={{ marginBottom: '10px' }}>
            <Grid.Row>
              <Grid.Column only="mobile">
                <Login {... this.props}/>
              </Grid.Column>
            </Grid.Row>
          </Grid>
          {display}
          <Divider />
          {activeusers}
        </div>
      );
    }
}

function mapStateToProps(state, ownProps) {
  return {
    account: state.account,
    preferences: state.preferences,
    status: state.status
  }
}

function mapDispatchToProps(dispatch) {
  return {actions: bindActionCreators({
    ...accountActions,
    ...breadcrumbActions,
    ...postActions,
    ...statusActions,
    ...preferenceActions
  }, dispatch)}
}

export default connect(mapStateToProps, mapDispatchToProps)(Forums);
