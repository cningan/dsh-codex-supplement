import test from 'node:test'
import assert from 'node:assert/strict'
import { parseScutilProxyOutput } from '../lib/shared/proxy.mjs'

const SAMPLE = `<dictionary> {
  ExceptionsList : <array> {
    0 : *.local
    1 : 169.254/16
  }
  FTPPassive : 1
  HTTPEnable : 1
  HTTPPort : 7897
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 7897
  HTTPSProxy : 127.0.0.1
  SOCKSEnable : 0
  SOCKSPort : 0
  SOCKSProxy : 127.0.0.1
}`

test('macOS system proxy is read from scutil output', () => {
  const detected = parseScutilProxyOutput(SAMPLE)
  assert.deepEqual(detected, { url: 'http://127.0.0.1:7897', source: 'auto' })
})

test('disabled proxies yield nothing so the request can go direct', () => {
  const disabled = parseScutilProxyOutput('<dictionary> { HTTPEnable : 0 }')
  assert.equal(disabled, undefined)
})

test('the SOCKS port is used when Clash exposes a mixed port', () => {
  const socks = `<dictionary> {
    SOCKSEnable : 1
    SOCKSPort : 7890
    SOCKSProxy : 127.0.0.1
  }`
  assert.deepEqual(parseScutilProxyOutput(socks), { url: 'http://127.0.0.1:7890', source: 'auto' })
})

test('garbage output does not crash the proxy resolver', () => {
  assert.equal(parseScutilProxyOutput(''), undefined)
  assert.equal(parseScutilProxyOutput('not a dictionary'), undefined)
})
