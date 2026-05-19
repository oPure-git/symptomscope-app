import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { checkRedFlags } = require('../src/lib/redFlags');

describe('checkRedFlags', () => {
  it('returns null for normal symptoms', () => {
    expect(checkRedFlags('mild headache for 2 days')).toBeNull();
    expect(checkRedFlags('sore throat and runny nose')).toBeNull();
    expect(checkRedFlags('stomach ache after eating')).toBeNull();
    expect(checkRedFlags('')).toBeNull();
  });

  it('detects chest pain variations', () => {
    expect(checkRedFlags('I have chest pain')).toBe('chest pain or pressure');
    expect(checkRedFlags('chest tightness when I walk')).toBe('chest pain or pressure');
    expect(checkRedFlags('chest pressure and sweating')).toBe('chest pain or pressure');
  });

  it('detects breathing difficulty', () => {
    expect(checkRedFlags('shortness of breath')).toBe('shortness of breath');
    expect(checkRedFlags("can't breathe properly")).toBe('difficulty breathing');
    expect(checkRedFlags('trouble breathing at night')).toBe('difficulty breathing');
    expect(checkRedFlags('difficulty breathing when lying down')).toBe('difficulty breathing');
  });

  it('detects stroke symptoms', () => {
    expect(checkRedFlags('face drooping on one side')).toBe('possible stroke symptoms');
    expect(checkRedFlags('arm weakness suddenly')).toBe('possible stroke symptoms');
    expect(checkRedFlags('sudden confusion and vision loss')).toBe('sudden neurological symptoms');
  });

  it('detects loss of consciousness', () => {
    expect(checkRedFlags('patient is unconscious')).toBe('loss of consciousness');
    expect(checkRedFlags('unresponsive after fall')).toBe('loss of consciousness');
  });

  it('detects overdose and self-harm', () => {
    expect(checkRedFlags('possible overdose of medication')).toBe('possible overdose');
    expect(checkRedFlags('thoughts of suicide')).toBe('thoughts of self-harm');
    expect(checkRedFlags('self-harm urges')).toBe('thoughts of self-harm');
  });

  it('detects anaphylaxis and severe bleeding', () => {
    expect(checkRedFlags('anaphylaxis after bee sting')).toBe('anaphylaxis');
    expect(checkRedFlags('severe bleeding from wound')).toBe('severe bleeding');
    expect(checkRedFlags("bleeding won't stop")).toBe('severe bleeding');
  });

  it('is case-insensitive', () => {
    expect(checkRedFlags('CHEST PAIN')).toBe('chest pain or pressure');
    expect(checkRedFlags('Shortness Of Breath')).toBe('shortness of breath');
    expect(checkRedFlags('OVERDOSE')).toBe('possible overdose');
  });

  it('returns the first matching flag only', () => {
    const result = checkRedFlags('chest pain and shortness of breath');
    expect(result).toBe('chest pain or pressure');
  });
});
