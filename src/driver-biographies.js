// Birth dates: https://api.jolpi.ca/ergast/f1/2026/drivers.json?limit=100
// Career facts: https://www.formula1.com/en/drivers, limited to the 2026 replay date.
export const DRIVER_BIOGRAPHIES = {
  RUS: { born: '1998-02-15', description: 'British racer. 2018 F2 champion and Mercedes race winner.' },
  VER: { born: '1997-09-30', description: "Dutch racer. Four-time world champion and F1's youngest race winner." },
  NOR: { born: '1999-11-13', description: 'British racer. 2025 world champion; McLaren driver since 2019.' },
  PIA: { born: '2001-04-06', description: 'Australian racer. F3 and F2 champion; joined McLaren in 2023.' },
  ANT: { born: '2006-08-25', description: 'Italian racer. F4 and Formula Regional champion; joined Mercedes in 2025.' },
  LEC: { born: '1997-10-16', description: 'Monegasque racer. F2 champion and Ferrari Grand Prix winner.' },
  ALO: { born: '1981-07-29', description: 'Spanish racer. Two-time world champion and two-time Le Mans winner.' },
  HAM: { born: '1985-01-07', description: 'British racer. Seven-time world champion; joined Ferrari in 2025.' },
  BEA: { born: '2005-05-08', description: 'British racer. Scored points on his F1 debut for Ferrari in 2024.' },
  SAI: { born: '1994-09-01', description: 'Spanish racer. Grand Prix winner; joined Williams in 2025.' },
  HAD: { born: '2004-09-28', description: 'French racer. F1 debut in 2025; joined Red Bull for the 2026 season.' },
  TSU: { born: '2000-05-11', description: 'Japanese racer. F1 debut in 2021; racing for Red Bull in 2025.' },
  STR: { born: '1998-10-29', description: 'Canadian racer. Took his first F1 podium in his 2017 rookie season.' },
  ALB: { born: '1996-03-23', description: 'Thai racer. F1 debut in 2019; joined Williams in 2022.' },
  LAW: { born: '2002-02-11', description: 'New Zealand racer. Made his F1 debut with AlphaTauri in 2023.' },
  COL: { born: '2003-05-27', description: 'Argentine racer. Debuted with Williams in 2024; joined Alpine in 2025.' },
  BOR: { born: '2004-10-14', description: 'Brazilian racer. Won consecutive F3 and F2 titles in 2023 and 2024.' },
  OCO: { born: '1996-09-17', description: 'French racer. Grand Prix winner; joined Haas for the 2025 season.' },
  GAS: { born: '1996-02-07', description: 'French racer. Won the 2020 Italian GP before moving to Alpine.' },
  LIN: { born: '2007-08-08', description: 'British rookie. F3 and F2 race winner; joined Racing Bulls in 2026.' },
  PER: { born: '1990-01-26', description: 'Mexican racer. Grand Prix winner; returned to F1 with Cadillac in 2026.' },
  BOT: { born: '1989-08-28', description: 'Finnish racer. Former Mercedes race winner; joined Cadillac in 2026.' },
  HUL: { born: '1987-08-19', description: 'German racer. F1 veteran and winner of the 2015 Le Mans 24 Hours.' },
};

export function driverAgeAt(born, date) {
  const [birthYear, birthMonth, birthDay] = born.split('-').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const birthdayAhead = month < birthMonth || (month === birthMonth && day < birthDay);
  return year - birthYear - Number(birthdayAhead);
}
