const RED_FLAGS = [
  { re: /chest\s+(pain|pressure|tightness)/i,             label: 'chest pain or pressure' },
  { re: /(can'?t|cannot|trouble|difficulty)\s+breath/i,   label: 'difficulty breathing' },
  { re: /shortness\s+of\s+breath/i,                       label: 'shortness of breath' },
  { re: /throat\s+(clos|swell)/i,                         label: 'throat closing or swelling' },
  { re: /(face|arm)\s+(droop|weak)/i,                     label: 'possible stroke symptoms' },
  { re: /sudden\s+(numbness|weakness|confusion|vision)/i, label: 'sudden neurological symptoms' },
  { re: /(unconscious|unresponsive)/i,                    label: 'loss of consciousness' },
  { re: /anaphyla/i,                                      label: 'anaphylaxis' },
  { re: /(severe\s+bleed|bleed.{0,20}won'?t stop|won'?t stop.{0,10}bleed)/i, label: 'severe bleeding' },
  { re: /overdose/i,                                      label: 'possible overdose' },
  { re: /(suicid|self.?harm)/i,                           label: 'thoughts of self-harm' },
];

function checkRedFlags(text) {
  for (const { re, label } of RED_FLAGS) {
    if (re.test(text)) return label;
  }
  return null;
}

module.exports = { RED_FLAGS, checkRedFlags };
