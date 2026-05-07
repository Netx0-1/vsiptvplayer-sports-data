# Vision IPTV Player Sports Data

Bu repo uygulamanin ana ekranindaki Spor Takvimi alanini besler.

Uygulama su dosyayi okur:

```text
https://raw.githubusercontent.com/Netx0-1/vsiptvplayer-sports-data/main/sports.json
```

## Format

`channels` alaninda kanal adi ile IPTV `stream_id` eslestirilir. Etkinlikte `channel` ayni yazilirsa uygulama direkt o yayini acar.

```json
{
  "updated_at": "2026-05-07 00:00",
  "channels": {
    "beIN SPORTS 1": "12345"
  },
  "events": [
    {
      "date": "2026-05-10",
      "time": "20:00",
      "sport": "Futbol",
      "league": "Super Lig",
      "title": "Takim A - Takim B",
      "channel": "beIN SPORTS 1"
    }
  ]
}
```

Etkinlige direkt `stream_id` veya tam `url` de verilebilir:

```json
{
  "title": "Final Maci",
  "channel": "beIN SPORTS 1",
  "stream_id": "12345"
}
```
