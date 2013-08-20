function task_item(item) {
  var done = item.done == true ? 'done' : 'pending';
  return '"[' + done + ']' + item.name + '"';
}

function format_date(date) {
  return "" + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() + 1) + ':' + date.getSeconds();
}

function export_binary(name, orig) {
  if (typeof orig == 'undefined')
    orig = {};
    
  var ret = localStorage[name];
  if (typeof ret == 'undefined') {
    return orig;
  }
  else {
     orig[name] = ret;
     return orig;
  }
}

function bs2import() {
  var e = $('#import');
  if (e.size() == 0) 
    e = $('<div id="import"><textarea></textarea></div>').appendTo('body');
    
  e.dialog({
      autoOpen: false,
      modal: true,
      width: 800,
      height: 500,
      title: 'Please paste your exported content and click IMPORT',
      buttons: {
        'Cancel': function () {
          $(this).dialog('close');
        },
        'IMPORT': function () {
          var content = e.find('textarea').val();
          var d=JSON.parse(content);
          for (var k in d) {
            localStorage[k] = d[k];
          }
          window.location.reload();
        }
      } 
    });
    
  e.find('textarea').css({
    width: '100%',
    height: '100%'
  });
  e.dialog('open');
}

function bs2export() {
  var e = $('#export_dialog');
  if (e.size() == 0) { 
    e = $('<div id="export_dialog"><select size=10></select></div>').appendTo('body').dialog({
      autoOpen: false,
      modal: true,
      width: 600,
      height: 500,
      title: 'Manage',
      buttons: {
        "Export All": function () {
          var content = {};
          for (var i in localStorage) {
            content = export_binary(i, content);
          }
          show_dialog('export', 'Exported all task lists and logs. Copy and save to anywhere you want', JSON.stringify(content));                    
        },
        "Export": function () {
          var id = $(this).find('select').val();
          var content = {};
          content = export_binary('LOG+' + id, content);
          content = export_binary(id, content);
          show_dialog('export', 'Exported that one. Copy and save to anywhere you want', JSON.stringify(content));                    
        },
        "": function (){},
        "Import": function () {
          $(this).dialog('close');
          bs2import();
        }
      } 
    });
  }
    
  var sel = e.find('select').css({
    width: '100%',
    height: '100%'
  });
  sel.find('option').remove();
  
  var ll = BS2LogManager.log_list();
  for (var i in ll) {
    $('<option value="' + ll[i] + '">' + ll[i] + '</option>').appendTo(sel);
  }
  e.dialog('open');
}

function show_dialog(id, title, content, callback) {
  var e = $('#' + id);
  if (e.size() == 0) 
    e = $('<div id="' + id + '"><textarea readonly=true></textarea></div>').appendTo('body');
    
  e.dialog({
      autoOpen: false,
      modal: true,
      width: 800,
      height: 500,
      title: title 
    });
    
  e.find('textarea').val(content).css({
    width: '100%',
    height: '100%'
  });
  e.dialog('open');
}


function BS2LogManager(id) {
  var self = this;
  
  this.id = id;

  function _perform_log(item) {
    var log_name = 'LOG+' + self.id;
    var logs = localStorage[log_name];
    if (typeof logs == 'undefined')
      logs = [item];
    else {
      logs = JSON.parse(logs);
      logs.push(item);
    }
    localStorage[log_name] = JSON.stringify(logs);
  }
  
  this.action_delete_list = function (data) {
    var time = new Date();
    
    _perform_log({
      action:'delete_list',
      time: time,
      msg: data.name         
    })
  }
  
  this.action_save_diff = function (old_data, new_data) {
    var time = new Date();
    
    // Create list
    if (old_data == null) {
      _perform_log({
        action:'create_list',
        time: time,
        msg: '"' + new_data.name + '"'         
      })
      return;    
    }

    // Diff name
    if (new_data.name != old_data.name) {
      _perform_log({
        action:'name',
        time: time,
        msg: 'from "' + old_data.name + '" to "' + new_data.name + '"'         
      })
      return;
    }

    // Clone to avoid corruption
    var old_l = old_data.list;
    var new_l = new_data.list;
    
    var action = null;
    var msg = "";
    var old_r = [], new_r = [];

    var i = 0, j = 0;
    while (i < old_l.length) {
      var dup = -1;
      j = 0;
      while (j < new_l.length) {
        if (new_l[j].name == old_l[i].name && new_l[j].done == old_l[i].done) {
          new_r.push(j);
          old_r.push(i);
          break;
        }
        j++;
      }

      i++; 
    }

    var n = [], o = [];
    for (var i in old_l) {
      if (old_r.indexOf(parseInt(i)) == -1) o.push(old_l[i]);
    } 
    for (var i in new_l)
      if (new_r.indexOf(parseInt(i)) == -1) n.push(new_l[i]); 
    
    if (o.length == 0 && n.length == 1) {
      // Found an added item
      msg = n[0].name;
      action = 'add';
    } else if (o.length == 1 && n.length == 1) {
      // A changed item
      if (o[0].done == false && n[0].done == true) {
        action = 'finish';
        msg = o[0].name;
      }
      else if (o[0].done == true && n[0].done == false) {
        action = 'revert';
        msg = o[0].name;
      }
      else {
        action = 'change';
        msg = 'from ' + task_item(o[0]) + ' to ' + task_item(n[0])
      }
        
    } else if (o.length == 1 && n.length == 0) {
      // Found a removed item
      msg = task_item(o[0]);
      action = 'remove';
    }
    
    if (!action) return;
    
    _perform_log({
      action: action,
      time: time,
      msg: msg         
    })     
  }
  
  this.toString = function () {
    var log_name = 'LOG+' + self.id;
    var logs = localStorage[log_name];
    if (typeof logs == 'undefined')
      return "No logs";
    logs = JSON.parse(logs);
    
    var s = [];
    for (var i in logs) {
      var item = logs[i];
      var date = new Date(item.time);
      var date = format_date(date); 
      s.push(date + ": " + item.action + " " + item.msg);
    }
    
    return s.join('\n'); 
  }
  
  this.show_log = function () {
    show_dialog('log_details', 'Log of ' + self.id, self.toString());
  }
}

BS2LogManager.log_list = function () {
  var ret = [];
  for (var k in localStorage) {
    if (k.indexOf('LOG+') == 0) {
      ret.push(k.substr(4));
    }
  }
  return ret;
}

BS2LogManager.remove = function (id) {
  delete localStorage['LOG+' + id];
}

BS2LogManager.clear_all = function (id) {
  var ll = BS2LogManager.log_list();
  for (var i in ll) {
    BS2LogManager.remove(ll[i]);
  }
}

BS2LogManager.show_log_list = function () {
  var e = $('#log_list');
  if (e.size() == 0) { 
    e = $('<div id="log_list"><select size=10></select></div>').appendTo('body').dialog({
      autoOpen: false,
      modal: true,
      width: 600,
      height: 500,
      title: 'Available log list',
      buttons: {
        "Delete All": function () {
          BS2LogManager.clear_all();
          $('select option', this).remove();
        },
        "Delete": function () {
          var id = $(this).find('select').val();
          BS2LogManager.remove(id);
          $('select option[value=' + id + ']', this).remove();
        },
        "": function (){},
        "Close": function () {
          $(this).dialog('close');
        },
        "View": function () {
          var id = $(this).find('select').val();
          var blm = new BS2LogManager(id);
          blm.show_log();
        }
      } 
    });
  }
    
  var sel = e.find('select').css({
    width: '100%',
    height: '100%'
  });
  sel.find('option').remove();
  
  var ll = BS2LogManager.log_list();
  for (var i in ll) {
    $('<option value="' + ll[i] + '">' + ll[i] + '</option>').appendTo(sel);
  }
  e.dialog('open');
}



function BS2TodoList(id) {
  var self = this;
  
  this.id = id;
  this.table = null;
  this.data = null;
  this.log = new BS2LogManager(id);
  
  ////////////////////////////
  function init_ui() {
    var tb = $('<table class="tasklist"><thead><tr><th colspan=2 class="name editable">My Todo<th class="actions_list"></thead><tbody></tbody><tfoot><tr><td class="done"><td class="add_line">Add...<td></tfoot></table>').insertBefore('#add_mark');
    self.table = tb;
  }

  function __editable_save__(e) {
    // Save editable. Called from inner input
    $(e).parent().html(e.value);
    self.save();
  }
  
  function init_edit(selector) {
    selector.find('.done').click(function () {
      var e = $('span', this)[0];
      if (e.className == 'true') 
        e.className = 'false';
      else
        e.className = 'true';
      self.save();
    });
    
    selector.find('.editable').click(function () {
      if ($('input', this).size() > 0) return;
      this.old_value = this.innerHTML;
      this.innerHTML = '<input value="' + this.innerHTML + '">';
      $('input', this).focus().blur(function () {
        // Savee
        __editable_save__(this);
      }).keyup(function (event) {
        if (event.keyCode == '13') {
          // Another Save
          event.preventDefault();
          __editable_save__(this);
          if (selector.is(':last')) {
            self.table.find('.add_line').click();
          }
        } else if (event.keyCode == '27') {
          // Cancel
          var e = $(this).parent();
          e.html(e.attr('old_value'));                    
        }
      });
    });
    
    selector.hover(function (){
      $('.actions', this).html('');
      $('.actions_list', this).html('');

      $('<a href="javascript:;" class="remove_line" title="Remove task">&nbsp;</a>').appendTo($('.actions', this)).click(function () {
        $(this).parent().parent().remove();
        self.save();
      });
      $('<a href="javascript:;" class="log_list" title="View log">&nbsp;</a>').appendTo($('.actions_list', this)).click(function () {
        self.log.show_log();
      });
      $('<a href="javascript:;" class="remove_list" title="Remove list">&nbsp;</a>').appendTo($('.actions_list', this)).click(function () {
        if (confirm("Are you sure to remove this list?")) {
          self.table.remove();
          self.log.action_delete_list(self.data);
          lm.remove(self.id);
        }
      });
    }, function () {
      $('.actions', this).html('');
      $('.actions_list', this).html('');
    });
  }
  
  function addline(item) {
      return $('<tr><td class="done"><span class="' + item.done + '">&nbsp;</span><td class="editable">' + item.name + '</td><td class="actions"></tr>').appendTo(self.table.find('tbody'));
  }
  
  function __addline_save__(e) {
    if (e.value) {
      var ret = addline({done:false, name:e.value});
      init_edit(ret);
      self.save();
    }
  }

  function init_addline_btn() {
    self.table.find('.add_line').click(function () {
      if ($('input', this).size() > 0) return;
      this.innerHTML = '<input value="">';
      $('input', this).focus().blur(function () {
        // Save
        __addline_save__(this);
        $(this).parent().html('Add...');
      }).keyup(function (event) {
        if (event.keyCode == '13') {
          // Another Save
          event.preventDefault();
          __addline_save__(this);

          this.value = '';
        } else if (event.keyCode == '27') {
          // Cancel
          $(this).parent().html('Add...');                    
        }
      });
    });
  }
  
  
  ////////////////////////
  this.set_name = function (name) {
    self.table.find('.name').html(name);
    self.save();
  }
  
  this.load = function() {
     var data = JSON.parse(localStorage[self.id]);
     self.load_from_data(data);    
  }
  
  this.save = function() {
    var l = [];
    var name = self.table.find('.name').html();
    self.table.find('tbody tr').each(function () {
      var done = $('.done span', this)[0].className == 'true' ? true : false;
      var name = $('.editable', this).html();
      l.push({name: name, done: done});
    });
    data = {
      name: name,
      list: l
    }
    localStorage[self.id] = JSON.stringify(data);
    
    self.log.action_save_diff(self.data, data);
    self.data = data;
  }
  
  this.load_from_data = function(data) {
    self.data = data;
    self.table.find('.name').html(data.name);
    self.table.find('tbody tr').remove();
    for (var i in data.list) {
      addline(data.list[i]);
    }
  
    init_edit(self.table.find('tbody tr'));
  }
  
  init_ui();
  init_edit(self.table.find('thead tr'));
  init_addline_btn();
}

function ListManager() {
  var self = this;
  var id_prefix = "BTL+"; 
  
  this.list = [];
  
  this.get_or_create = function(id) {
    if (typeof id !== 'undefined') {
      for (var i in self.list)
        if (self.list[i].id === id) return [self.list[i], false];
    }
    
    var ret = new BS2TodoList(id);
    self.list.push(ret);
    
    return [ret, true];  
  }
  
  this.create = function () {
    var name = prompt('Create a list', "My Todo");
    if (!name) return;
    var id = format_date(new Date());
    var ret = self.get_or_create(id_prefix + id + '+' + Math.random() + '+' + name);
    if (!ret[1]) {
      alert("List with such name already existed!");
    } else {
      ret[0].set_name(name);
    }
  }
  
  this.remove = function (id) {
    var new_list = [];
    for (var i in self.list)
      if (self.list[i].id != id) {
        new_list.push(self.list[i]);
      }
    self.list = new_list;
    delete localStorage[id];
  }
  
  this.load_all = function() {
    var t = [];
    for (var k in localStorage) {
      if (k.indexOf(id_prefix) == 0)
        t.push(k);
    }
    t = t.sort();
    for (var k in t) {
      var tl = self.get_or_create(t[k]);
      tl[0].load();
    }
  }
  
  this.samples = function () {
    var t1 = self.get_or_create('' + Math.random());
    t1[0].load_from_data({
      name: 'Todo1',
      list: [
      {name:'Item 1', done:false},
      {name:'Item 2', done:false},
      {name:'Item 3', done:false},
    ]}
    );
    t1 = self.get_or_create('' + Math.random());
    t1[0].load_from_data({
      name: 'Todo2',
      list: [
      {name:'Item 1', done:false},
      {name:'Item 2', done:false},
      {name:'Item 3', done:false},
    ]}
    );
  }
}
