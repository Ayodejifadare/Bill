import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    expect(() => {
      act(() => {
        renderer.create(<App />);
      });
    }).not.toThrow();
  });
});
