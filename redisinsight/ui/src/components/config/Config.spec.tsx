import React from 'react'
import { cloneDeep } from 'lodash'
import { render, mockedStore, cleanup } from 'uiSrc/utils/test-utils'

import {
  getUserConfigSettings,
  setSettingsPopupState,
  userSettingsSelector,
} from 'uiSrc/slices/user/user-settings'
import { getServerInfo } from 'uiSrc/slices/app/info'
import { processCliClient } from 'uiSrc/slices/cli/cli-settings'
import { getRedisCommands } from 'uiSrc/slices/app/redis-commands'
import Config from './Config'

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

jest.mock('uiSrc/slices/user/user-settings', () => ({
  ...jest.requireActual('uiSrc/slices/user/user-settings'),
  userSettingsSelector: jest.fn().mockReturnValue({
    config: {
      agreements: {},
    },
    spec: {
      agreements: {},
    },
  }),
}))

describe('Config', () => {
  it('should render', () => {
    render(<Config />)
    const afterRenderActions = [
      getServerInfo(),
      processCliClient(),
      getRedisCommands(),
      getUserConfigSettings()
    ]
    expect(store.getActions()).toEqual([...afterRenderActions])
  })

  it('should call setSettingsPopupState with difference of agreements', () => {
    const userSettingsSelectorMock = jest.fn().mockReturnValue({
      config: {
        agreements: {},
      },
      spec: {
        agreements: {
          eula: {
            defaultValue: false,
            required: true,
            editable: false,
            since: '1.0.0',
            title: 'EULA: RedisInsight License Terms',
            label: 'Label',
          },
        },
      },
    })
    userSettingsSelector.mockImplementation(userSettingsSelectorMock)
    render(<Config />)
    const afterRenderActions = [
      getServerInfo(),
      processCliClient(),
      getRedisCommands(),
      getUserConfigSettings(),
      setSettingsPopupState(true),
    ]
    expect(store.getActions()).toEqual([...afterRenderActions])
  })
})
