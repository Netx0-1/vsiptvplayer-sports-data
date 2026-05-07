const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES_PATH = path.join(ROOT, 'sources.json');
const CHANNELS_PATH = path.join(ROOT, 'channels.json');
const OUTPUT_PATH = path.join(ROOT, 'sports.json');
const DAYS_AHEAD = Number(process.env.DAYS_AHEAD || 7);
const MAX_EVENTS = Number(process.env.MAX_EVENTS || 40);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalize(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u0130/g, 'I')
    .toUpperCase();
}

function buildChannelLookup(channels) {
  const lookup = new Map();

  for (const [name, streamId] of Object.entries(channels)) {
    const id = String(streamId || '').trim();
    if (!id) {
      continue;
    }

    const variants = new Set([
      name,
      name.replace(/\bHD\b|\bUHD\b|\bSD\b/gi, '').trim(),
      name.replace(/BEINSPORTS/gi, 'beIN SPORTS'),
      name.replace(/beIN SPORTS/gi, 'BEINSPORTS')
    ]);

    for (const variant of variants) {
      lookup.set(normalize(variant), { name: variant.trim(), streamId: id });
    }
  }

  return lookup;
}

function extractInitialState(html) {
  const marker = 'window.__INITIAL_STATE__=';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error('Initial state not found');
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(';document.currentScript.remove()', jsonStart);
  if (jsonEnd === -1) {
    throw new Error('Initial state end marker not found');
  }

  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function parseTurkeyDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute));
}

function formatDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) {
    return { date: '', time: '' };
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`
  };
}

function choosePlayableChannel(event, channelLookup) {
  for (const channel of event.channels || []) {
    const match = channelLookup.get(normalize(channel.name));
    if (match) {
      return {
        channel: match.name,
        streamId: match.streamId
      };
    }
  }

  return null;
}

async function fetchEvents(source, channelLookup) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'VisionIPTVPlayerSportsBot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`${source.name}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const state = extractInitialState(html);
  const events = Array.isArray(state.common?.events) ? state.common.events : [];
  const now = new Date();
  const earliest = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const latest = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  return events
    .filter((event) => event.event_type_name === 'match')
    .map((event) => {
      const startsAt = parseTurkeyDateTime(event.date_time);
      const playable = choosePlayableChannel(event, channelLookup);
      if (!startsAt || startsAt < earliest || startsAt > latest || !playable) {
        return null;
      }

      const { date, time } = formatDateTime(event.date_time);
      const title = event.name || [event.home_name, event.away_name].filter(Boolean).join(' - ');

      return {
        id: String(event.id || `${date}-${time}-${title}`),
        sortKey: `${date} ${time} ${title}`,
        date,
        time,
        sport: event.sport_name || '',
        league: [event.league_name, event.post_fix].filter(Boolean).join(' '),
        title,
        channel: playable.channel,
        stream_id: playable.streamId
      };
    })
    .filter(Boolean);
}

function uniqueEvents(events) {
  const seen = new Set();
  return events
    .sort((first, second) => first.sortKey.localeCompare(second.sortKey, 'tr'))
    .filter((event) => {
      const key = event.id;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_EVENTS)
    .map(({ sortKey, id, ...event }) => event);
}

async function main() {
  const sources = readJson(SOURCES_PATH);
  const channels = readJson(CHANNELS_PATH);
  const channelLookup = buildChannelLookup(channels);
  const allEvents = [];

  for (const source of sources) {
    try {
      const events = await fetchEvents(source, channelLookup);
      console.log(`${source.name}: ${events.length} playable event(s)`);
      allEvents.push(...events);
    } catch (error) {
      console.warn(`WARN ${error.message}`);
    }
  }

  const output = {
    updated_at: new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date()).replace(',', ''),
    channels,
    events: uniqueEvents(allEvents)
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${output.events.length} event(s) to sports.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
