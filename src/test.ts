import * as bs58 from 'bs58';

function test() {
  const test = bs58.decode(
    '43xQCVeSAFPtDjEwyTQCirhDfybneT9p4A8HBzX3VBUonkqwi9VPUkgiS1ViZLDbhYBRRrmS6byt1EtoBMcnBESu',
  );
  console.log(test);
}

test();
