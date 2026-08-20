(function () {
  'use strict';

  var APP_ID = 'ra-voice-autofill';
  var STORAGE_KEY = 'ra-voice-autofill-v2';
  var LEGACY_KEY = 'ra-voice-autofill-v1';
  var diffSerial = 0;

  if (document.getElementById(APP_ID)) return;

  function span(key, label) { return { key: key, label: label, span: true }; }
  function series(prefix, label, count, subFn) {
    var rows = [];
    for (var i = 1; i <= count; i++) rows.push({ key: prefix + i, family: prefix, label: label, sub: subFn ? subFn(i) : String(i) });
    return rows;
  }

  var GROUPS = [
    { id: 'grand', title: 'Grand summon', rows: [span('summon', '召喚'), span('temporaryJoin', '仮加入'), span('fullJoin', '本加入')] },
    { id: 'synthesis', title: 'Synthesis', rows: series('level', 'レベルアップ', 3).concat(series('ascension', '霊基再臨', 4)) },
    { id: 'battle', title: 'Battle', rows: [].concat(series('start', '開始', 4), series('skill', 'スキル', 4), series('command', 'コマンドカード', 3), series('npCard', '宝具カード', 3), series('attack', 'アタック', 6), series('extra', 'エクストラアタック', 4), series('np', '宝具', 3), series('damage', 'ダメージ', 4), series('defeat', '戦闘不能', 4), series('victory', '勝利', 4)) },
    { id: 'myroom', title: 'My room', rows: [span('likes', '好きなこと'), span('dislikes', '嫌いなこと'), span('grail', '聖杯について')].concat(series('bond', '絆', 5, function (i) { return 'Lv.' + i; }), [span('event', 'イベント開催中'), span('birthday', '誕生日')]) }
  ];
  var DIFF_EXTRA = span('costume', '霊衣について');

  var style = document.createElement('style');
  style.textContent = [
    '#' + APP_ID + '{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;max-width:1180px;margin:16px auto;padding:16px;border:1px solid #d8dee6;border-radius:10px;background:#fff;color:#222;box-sizing:border-box}',
    '#' + APP_ID + ' *{box-sizing:border-box}',
    '#' + APP_ID + ' h2{margin:0 0 8px;font-size:22px}',
    '#' + APP_ID + ' .ra-note{margin:0 0 14px;color:#555;font-size:13px;line-height:1.7}',
    '#' + APP_ID + ' details{border:1px solid #d8dee6;border-radius:8px;margin:10px 0;background:#fafbfc}',
    '#' + APP_ID + ' summary{cursor:pointer;font-weight:700;padding:10px 12px;background:#f1f3f5;border-radius:8px}',
    '#' + APP_ID + ' .ra-body{padding:12px}',
    '#' + APP_ID + ' .ra-row{display:grid;grid-template-columns:140px 90px minmax(0,1fr);gap:8px;align-items:start;margin:8px 0}',
    '#' + APP_ID + ' .ra-row.ra-span{grid-template-columns:230px minmax(0,1fr)}',
    '#' + APP_ID + ' .ra-label,#' + APP_ID + ' .ra-sub{font-size:13px;font-weight:600;padding-top:9px}',
    '#' + APP_ID + ' textarea,#' + APP_ID + ' input[type=text]{width:100%;border:1px solid #cbd3dc;border-radius:6px;padding:8px;background:#fff;color:#222;font:inherit}',
    '#' + APP_ID + ' textarea{min-height:62px;line-height:1.55;resize:vertical}',
    '#' + APP_ID + ' .ra-talk-content{display:grid;gap:6px}',
    '#' + APP_ID + ' .ra-related-wrap{display:grid;grid-template-columns:150px minmax(0,1fr);gap:6px;align-items:center}',
    '#' + APP_ID + ' .ra-related-label{font-size:12px;font-weight:600;color:#555}',
    '#' + APP_ID + ' .ra-related-wrap input{font-size:13px}',
    '#' + APP_ID + ' .ra-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}',
    '#' + APP_ID + ' .ra-talk-actions{margin:8px 0 14px 230px}',
    '#' + APP_ID + ' button{border:1px solid #9aa7b4;background:#f5f7f9;color:#222;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:600}',
    '#' + APP_ID + ' button:hover{background:#e9edf1}',
    '#' + APP_ID + ' button.ra-primary{background:#2f6fdd;color:#fff;border-color:#2f6fdd}',
    '#' + APP_ID + ' button.ra-danger{color:#a12622}',
    '#' + APP_ID + ' .ra-output{min-height:360px;font-family:Consolas,"Noto Sans Mono CJK JP",monospace;white-space:pre}',
    '#' + APP_ID + ' .ra-status{min-height:20px;font-size:13px;color:#2c6b2f}',
    '#' + APP_ID + ' .ra-diff-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin-bottom:10px}',
    '#' + APP_ID + ' .ra-field label{display:block;font-size:13px;font-weight:700;margin-bottom:4px}',
    '@media(max-width:760px){#' + APP_ID + ' .ra-row,#' + APP_ID + ' .ra-row.ra-span,#' + APP_ID + ' .ra-diff-head,#' + APP_ID + ' .ra-related-wrap{grid-template-columns:1fr}#' + APP_ID + ' .ra-label,#' + APP_ID + ' .ra-sub{padding-top:0}#' + APP_ID + ' .ra-talk-actions{margin-left:0}}'
  ].join('');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = APP_ID;
  root.innerHTML = [
    '<h2>FGO 台詞オートフィル</h2>',
    '<p class="ra-note">台詞を入力すると指定テンプレートの@wiki記法を生成します。通常・差分とも未入力行と空セクションは生成しません。My room の会話は初期3件で、「会話を追加」から必要数だけ増やせます。関連サーヴァントを指定した会話は、台詞末尾へ所属条件リンクを自動付与します。</p>',
    '<div id="ra-normal"></div>',
    '<div class="ra-actions"><button id="ra-add-diff" type="button">差分を追加</button></div>',
    '<div id="ra-diffs"></div>',
    '<div class="ra-actions"><button id="ra-generate" class="ra-primary" type="button">@wiki記法を生成</button><button id="ra-copy" type="button">生成結果をコピー</button><button id="ra-save" type="button">入力内容を保存</button><button id="ra-clear" type="button">すべてクリア</button></div>',
    '<div id="ra-status" class="ra-status" aria-live="polite"></div>',
    '<div><label for="ra-output" style="display:block;font-size:13px;font-weight:700;margin-bottom:4px">生成結果</label><textarea id="ra-output" class="ra-output" spellcheck="false"></textarea></div>'
  ].join('');
  var current = document.currentScript;
  if (current && current.parentNode) current.parentNode.insertBefore(root, current.nextSibling); else document.body.appendChild(root);

  var normalHost = root.querySelector('#ra-normal');
  var diffsHost = root.querySelector('#ra-diffs');
  var statusEl = root.querySelector('#ra-status');
  var outputEl = root.querySelector('#ra-output');

  function esc(value) { return String(value).replace(/[&<>"']/g, function (ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function rowHtml(row) { if (row.span) return '<div class="ra-row ra-span"><div class="ra-label">' + esc(row.label) + '</div><textarea data-key="' + row.key + '"></textarea></div>'; return '<div class="ra-row"><div class="ra-label">' + esc(row.label) + '</div><div class="ra-sub">' + esc(row.sub) + '</div><textarea data-key="' + row.key + '"></textarea></div>'; }
  function talkRow(index) { return { key: 'talk' + index, family: 'talk', label: '会話', sub: String(index) }; }
  function talkRowHtml(index) {
    return '<div class="ra-row ra-talk-row" data-talk-index="' + index + '"><div class="ra-label">会話</div><div class="ra-sub">' + index + '</div><div class="ra-talk-content"><textarea data-key="talk' + index + '"></textarea><div class="ra-related-wrap"><div class="ra-related-label">関連サーヴァント（任意）</div><input type="text" data-key="relatedTalk' + index + '" placeholder="〇〇 または 〇〇>〇〇/セイバー"></div></div></div>';
  }
  function editorBodyHtml(extra) {
    var parts = [];
    GROUPS.forEach(function (group) {
      parts.push('<section data-group="' + group.id + '"><h3 style="font-size:15px;margin:14px 0 6px">' + esc(group.title) + '</h3>');
      if (group.id === 'myroom') { parts.push('<div data-talk-list>'); for (var i = 1; i <= 3; i++) parts.push(talkRowHtml(i)); parts.push('</div><div class="ra-talk-actions"><button type="button" data-add-talk>会話を追加</button></div>'); }
      group.rows.forEach(function (row) { parts.push(rowHtml(row)); });
      if (group.id === 'myroom' && extra) parts.push(rowHtml(DIFF_EXTRA));
      parts.push('</section>');
    });
    return parts.join('');
  }
  function diffHtml(id, title) { return '<details class="ra-editor ra-diff" data-diff-id="' + id + '" open><summary>差分台詞 ' + id + '</summary><div class="ra-body"><div class="ra-diff-head"><div class="ra-field"><label>差分ブロック名</label><input type="text" data-role="diff-title" value="' + esc(title || ('差分台詞' + id)) + '"></div><button type="button" class="ra-danger" data-remove-diff>この差分を削除</button></div>' + editorBodyHtml(true) + '</div></details>'; }
  normalHost.innerHTML = '<details class="ra-editor" open><summary>通常台詞</summary><div class="ra-body">' + editorBodyHtml(false) + '</div></details>';

  function setStatus(text, isError) { statusEl.textContent = text || ''; statusEl.style.color = isError ? '#b42318' : '#2c6b2f'; }
  function nl(value) { return String(value == null ? '' : value).replace(/\r\n?/g, '\n'); }
  function filled(value) { return nl(value).trim() !== ''; }
  function normLine(line) {
    var text = String(line || '').replace(/\.{2,}/g, '……').replace(/…+/g, '……').replace(/・{3,}/g, '……').replace(/(?:--+|－{2,}|—+|―+)/g, '――').replace(/!/g, '！').replace(/\?/g, '？');
    var result = '', i = 0;
    while (i < text.length) {
      var ch = text.charAt(i);
      if (ch !== '！' && ch !== '？') { result += ch; i++; continue; }
      var marks = '';
      while (i < text.length && (text.charAt(i) === '！' || text.charAt(i) === '？')) marks += text.charAt(i++);
      result += marks;
      var rest = text.slice(i);
      if (!rest) continue;
      if (/^[ \t\u3000]/.test(rest)) { result += ' '; text = text.slice(0, i) + rest.replace(/^[ \t\u3000]+/, ''); continue; }
      if (/^[」』）】〉》〕］｝”’]+$/.test(rest)) continue;
      result += ' ';
    }
    return result;
  }
  function cell(value) { return nl(value).split('\n').map(normLine).join('\n').replace(/\|/g, '&#124;').split('\n').join('&br()'); }
  function collect(editor) { var data = {}; Array.prototype.forEach.call(editor.querySelectorAll('[data-key]'), function (el) { data[el.getAttribute('data-key')] = el.value; }); return data; }
  function talkIndicesFromData(data) { var indices = []; Object.keys(data || {}).forEach(function (key) { var match = key.match(/^talk(\d+)$/); if (match) indices.push(Number(match[1])); }); return indices.sort(function (a, b) { return a - b; }); }
  function talkRowsForData(data) { return talkIndicesFromData(data).map(talkRow); }
  function groupRows(group, data) { return group.id === 'myroom' ? talkRowsForData(data).concat(group.rows) : group.rows; }
  function used(group, data) { return groupRows(group, data).filter(function (row) { return filled(data[row.key]); }); }
  function hasData(data, extra) { return GROUPS.some(function (group) { return used(group, data).length > 0; }) || (extra && filled(data.costume)); }
  function relatedKeyForTalk(row) { if (!row || row.family !== 'talk') return ''; var match = row.key.match(/^talk(\d+)$/); return match ? 'relatedTalk' + match[1] : ''; }
  function relatedSuffix(value) { var text = String(value == null ? '' : value).trim(); if (!text) return ''; if (/^\[\[.*\]\]$/.test(text)) text = text.slice(2, -2).trim(); text = text.replace(/\|/g, '&#124;'); if (!text) return ''; return '（[[' + text + ']]所属時）'; }
  function pushRows(lines, rows, data) {
    var seen = {};
    rows.forEach(function (row) {
      var value = cell(data[row.key]);
      var relatedKey = relatedKeyForTalk(row);
      if (relatedKey) value += relatedSuffix(data[relatedKey]);
      if (row.span) { lines.push('|>|' + row.label + '|' + value + '|'); return; }
      var first = seen[row.family] ? '~' : row.label;
      seen[row.family] = true;
      lines.push('|' + first + '|' + row.sub + '|' + value + '|');
    });
  }
  function region(title, data, extra) {
    var lines = ['#region(close,' + String(title || '差分台詞').replace(/\|/g, '&#124;') + ')'];
    if (hasData(data, extra)) {
      lines.push('|BGCOLOR(#F5FFFA):CENTER:110|BGCOLOR(#F5FFFA):CENTER:40|BGCOLOR(#F5FFFA):LEFT:1000|c');
      GROUPS.forEach(function (group) {
        var rows = used(group, data), hasCostume = group.id === 'myroom' && extra && filled(data.costume);
        if (!rows.length && !hasCostume) return;
        lines.push('|>|>|BGCOLOR(#E6E6FA):CENTER:' + group.title + '|');
        if (rows.length) pushRows(lines, rows, data);
        if (hasCostume) lines.push('|>|霊衣について|' + cell(data.costume) + '|');
      });
    }
    lines.push('#endregion()');
    return lines.join('\n');
  }
  function output() {
    var blocks = ['//新テンプレ', '//  ・「……」：三点リーダー', '//  ・「――」：ダッシュ', '//  ・ 感嘆符、疑問符は全角。文末でなければ後ろに空白を挿入する', ''];
    blocks.push(region('セリフ一覧', collect(normalHost.querySelector('.ra-editor')), false));
    Array.prototype.forEach.call(diffsHost.querySelectorAll('.ra-diff'), function (editor) { var data = collect(editor); if (!hasData(data, true)) return; blocks.push('', region(editor.querySelector('[data-role="diff-title"]').value.trim() || '差分台詞', data, true)); });
    return blocks.join('\n');
  }

  function currentTalkCount(editor) { return editor.querySelectorAll('[data-talk-list] [data-talk-index]').length; }
  function addTalk(editor, forcedIndex) { var list = editor.querySelector('[data-talk-list]'), next = forcedIndex || (currentTalkCount(editor) + 1); if (editor.querySelector('[data-talk-index="' + next + '"]')) return; var holder = document.createElement('div'); holder.innerHTML = talkRowHtml(next); list.appendChild(holder.firstChild); }
  function ensureTalkRows(editor, data, savedCount) { var filledExtraIndices = talkIndicesFromData(data).filter(function (index) { return index > 3 && filled(data['talk' + index]); }); var maxFilled = filledExtraIndices.length ? Math.max.apply(Math, filledExtraIndices) : 3, max = Math.max(3, Number(savedCount) || 0, maxFilled); for (var i = 4; i <= max; i++) addTalk(editor, i); }
  function addDiff(title, data, talkCount) { diffSerial++; var holder = document.createElement('div'); holder.innerHTML = diffHtml(diffSerial, title); var editor = holder.firstChild; diffsHost.appendChild(editor); if (data) { ensureTalkRows(editor, data, talkCount); applyData(editor, data); } return editor; }
  function serialize() { var diffs = []; Array.prototype.forEach.call(diffsHost.querySelectorAll('.ra-diff'), function (editor) { diffs.push({ title: editor.querySelector('[data-role="diff-title"]').value, talkCount: currentTalkCount(editor), data: collect(editor) }); }); return { normal: collect(normalHost.querySelector('.ra-editor')), normalTalkCount: currentTalkCount(normalHost.querySelector('.ra-editor')), diffs: diffs }; }
  function save(showMessage) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize())); if (showMessage !== false) setStatus('入力内容をこのブラウザに保存しました。'); } catch (e) { if (showMessage !== false) setStatus('入力内容を保存できませんでした。', true); } }
  function applyData(editor, data) { Object.keys(data || {}).forEach(function (key) { var el = editor.querySelector('[data-key="' + key + '"]'); if (el) el.value = data[key]; }); }
  function migrateLegacy(data) { if (!data || typeof data !== 'object') return null; var normal = {}, diff = {}; Object.keys(data).forEach(function (key) { if (key.indexOf('normal_') === 0) normal[key.slice(7)] = data[key]; else if (key.indexOf('trueName_') === 0) diff[key.slice(9)] = data[key]; }); var result = { normal: normal, diffs: [] }; if (Object.keys(diff).some(function (key) { return filled(diff[key]); })) result.diffs.push({ title: '真名判明時', data: diff }); return result; }
  function restore() { try { var raw = localStorage.getItem(STORAGE_KEY), data = raw ? JSON.parse(raw) : null; if (!data) { var legacyRaw = localStorage.getItem(LEGACY_KEY); if (legacyRaw) data = migrateLegacy(JSON.parse(legacyRaw)); } if (!data) return; var normalEditor = normalHost.querySelector('.ra-editor'); ensureTalkRows(normalEditor, data.normal || {}, data.normalTalkCount); applyData(normalEditor, data.normal || {}); (data.diffs || []).forEach(function (item) { addDiff(item.title, item.data || {}, item.talkCount); }); setStatus('前回保存した入力内容を復元しました。'); } catch (e) { setStatus('保存データの復元に失敗しました。', true); } }
  function generate() { outputEl.value = output(); save(false); setStatus('生成しました。未入力行と空セクションは省略しています。'); }
  function fallbackCopy() { outputEl.focus(); outputEl.select(); try { document.execCommand('copy'); setStatus('生成結果をクリップボードへコピーしました。'); } catch (e) { setStatus('自動コピーに失敗しました。生成結果を選択して手動でコピーしてください。', true); } }
  function copy() { if (!outputEl.value.trim()) generate(); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(outputEl.value).then(function () { setStatus('生成結果をクリップボードへコピーしました。'); }).catch(fallbackCopy); else fallbackCopy(); }
  function resetEditorTalks(editor) { var list = editor.querySelector('[data-talk-list]'); if (!list) return; Array.prototype.slice.call(list.querySelectorAll('[data-talk-index]')).forEach(function (row) { var index = Number(row.getAttribute('data-talk-index')); if (index > 3 && row.parentNode) row.parentNode.removeChild(row); }); }
  function clearAll() { if (!window.confirm('入力内容と保存データをすべて消去します。よろしいですか？')) return; localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); var normalEditor = normalHost.querySelector('.ra-editor'); resetEditorTalks(normalEditor); Array.prototype.forEach.call(normalEditor.querySelectorAll('textarea,input[type=text]'), function (el) { el.value = ''; }); diffsHost.innerHTML = ''; diffSerial = 0; outputEl.value = ''; setStatus('クリアしました。'); }

  root.querySelector('#ra-add-diff').addEventListener('click', function () { addDiff(); });
  root.querySelector('#ra-generate').addEventListener('click', generate);
  root.querySelector('#ra-copy').addEventListener('click', copy);
  root.querySelector('#ra-save').addEventListener('click', function () { save(true); });
  root.querySelector('#ra-clear').addEventListener('click', clearAll);
  root.addEventListener('click', function (event) {
    var addTalkButton = event.target.closest('[data-add-talk]');
    if (addTalkButton) { addTalk(addTalkButton.closest('.ra-editor')); return; }
    var removeDiffButton = event.target.closest('[data-remove-diff]');
    if (removeDiffButton) { var editor = removeDiffButton.closest('.ra-diff'); if (editor && editor.parentNode) editor.parentNode.removeChild(editor); }
  });
  restore();
}());
