// @flow
import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { StyleSheet } from 'react-native'
import { StackNavigator } from 'react-navigation'

import { CustomText } from '../components'
import LockEnter from './lock-enter'
import { color, OFFSET_2X } from '../common/styles'
import { lockEnterPinRoute, lockPinSetupRoute, homeRoute } from '../common'
import type { ReactNavigation } from '../common/type-common'
import type { Store } from '../store/type-store'
import type { LockEnterPinProps, LockEnterPinState } from './type-lock'
import { clearPendingRedirect } from './lock-store'
import {
  ENTER_PASS_CODE_MESSAGE,
  ENTER_YOUR_PASS_CODE_MESSAGE,
} from '../common/message-constants'
import { tertiaryHeaderStyles } from '../components/layout/header-styles'
import { UNLOCKING_APP_WAIT_MESSAGE } from '../common/message-constants'
import { unlockApp } from './lock-store'

export class LockEnterPin extends PureComponent<
  LockEnterPinProps,
  LockEnterPinState
> {
  state = {
    authenticationSuccess: false,
  }

  static navigationOptions = () => ({
    headerTitle: (
      <CustomText bg="tertiary" tertiary transparentBg semiBold>
        App Security
      </CustomText>
    ),
    headerStyle: tertiaryHeaderStyles.header,
  })

  componentWillReceiveProps(nextProps: LockEnterPinProps) {
    if (
      this.props.isFetchingInvitation !== nextProps.isFetchingInvitation &&
      nextProps.isFetchingInvitation === false &&
      nextProps.pendingRedirection
    ) {
      if (this.state.authenticationSuccess) {
        // passing the nextProps in to the redirect function
        // the prop is being changed (pendingRedirection) from object to null
        // CLEAR_PENDING_REDIRECT clearing the pendingRedirection property to null
        // so, the previous props are being sent for the redirection
        this.redirect(nextProps)
      }
    }
  }

  // passing the props in to the function
  redirect = (props: LockEnterPinProps) => {
    props.unlockApp()
    if (props.pendingRedirection) {
      props.pendingRedirection.forEach(pendingRedirection => {
        setTimeout(() => {
          props.navigation.navigate(
            pendingRedirection.routeName,
            pendingRedirection.params
          )
        }, 0)
      })
      props.clearPendingRedirect()
    } else if (props.isAppLocked === true) {
      // * if app is unlocked and invitation is fetched , with out this condition we are redirecting user to home screen from invitation screen.
      // * this condition will avoid redirecting user to home screen if app is already unlocked
      props.navigation.navigate(homeRoute)
    }
  }

  onSuccess = () => {
    if (!this.state.authenticationSuccess) {
      this.setState({ authenticationSuccess: true })
      // if we reach at this screen from settings page
      // then user is trying to enable/disable touch id
      if (this.props.existingPin) {
        this.props.navigation.navigate(lockPinSetupRoute, {
          existingPin: true,
        })
      } else if (this.props.isFetchingInvitation === false) {
        // user is trying to unlock the app
        // check if user has some pending action, so redirect to those
        this.redirect(this.props)
      }
    }
  }

  render() {
    const { isFetchingInvitation } = this.props

    let message = this.props.existingPin
      ? ENTER_YOUR_PASS_CODE_MESSAGE
      : ENTER_PASS_CODE_MESSAGE

    if (isFetchingInvitation && this.state.authenticationSuccess) {
      message = UNLOCKING_APP_WAIT_MESSAGE
    }

    return <LockEnter onSuccess={this.onSuccess} message={message} />
  }
}

const mapStateToProps = (state: Store, { navigation }: ReactNavigation) => ({
  pendingRedirection: state.lock.pendingRedirection,
  isFetchingInvitation: Object.keys(state.smsPendingInvitation).some(
    smsToken =>
      state.smsPendingInvitation[smsToken] &&
      state.smsPendingInvitation[smsToken].isFetching === true
  ),
  existingPin: navigation.state
    ? navigation.state.params ? navigation.state.params.existingPin : false
    : false,
  isAppLocked: state.lock.isAppLocked,
})

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      clearPendingRedirect,
      unlockApp,
    },
    dispatch
  )

export default StackNavigator({
  [lockEnterPinRoute]: {
    screen: connect(mapStateToProps, mapDispatchToProps)(LockEnterPin),
  },
})
