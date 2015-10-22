(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () {
      return (root.graph = factory());
    });
  } else if (typeof module === 'object' && module.exports) {

    module.exports = factory();
  } else {
    root.graph = factory();
  }
}(this, function () {
  'use strict';

  var resolve = function(uri, graph) {
    var i = uri.indexOf(":");
    var prefix = uri.substr(0, i);
    if (graph.context[prefix]) {
      return graph.context[prefix] + uri.substr(i + 1);
    }

    // not in context, return unmodified (or throw error?)
    return uri;
  };

  var shortForm = function(s) {
    for (var i = s.length; i > 0; i--) {
      if (s[i] === ":" || s[i] === "#") {
        return s.substr(i+1);
      }
    }
    return s;
  };

  var Node = function(id, graph) {
    this.id = id;
    this.graph = graph;
  };

  var parseNode = function(node, graph) {
    var res = {$out: {}, $in: {}};
    var parseProperty = function (e) {
      if (typeof(e) === "string") {
        v.push({value: e});
      } else if (e["@language"]) {
        v.push({value: e["@value"], lang: e["@language"]});
      } else if (e["@type"]) {
        v.push({value: e["@value"], type: resolve(e["@type"], graph)});
      } else if (e["@id"]) {
        if (!res.$out[shortForm(prop)]) {
          res.$out[shortForm(prop)] = [];
        }
        res.$out[shortForm(prop)].push(e["@id"]);

        if (!graph.tempIn[e["@id"]]) {
          graph.tempIn[e["@id"]] = {};
        }
        if (!graph.tempIn[e["@id"]][shortForm(prop)]) {
          graph.tempIn[e["@id"]][shortForm(prop)] = [];
        }
        graph.tempIn[e["@id"]][shortForm(prop)].push(node["@id"]);

        v = undefined; // flag that property is not a literal
      } else {
        throw new Error("cannot parse property: " + JSON.stringify(e));
      }
    };
    for (var prop in node) {
      switch (prop) {
        case "@id":
          case "@context":
        break;
          case "@type":
          res.$type = node[prop];
          break;
        default:
          var v = [];
          if (typeof(node[prop]) === "string") {
            // plain string literal
            v.push({value: node[prop]});
          } else if (typeof(node[prop]) === 'boolean') {
            v.push({value: node[prop], type: "http://www.w3.org/2001/XMLSchema#boolean"});
          } else if (Array.isArray(node[prop])) {
             // multiple values of one property
              node[prop].forEach(parseProperty);
          } else {
            // typed literal or language-tagged literal
            if (node[prop]["@language"]) {
              v.push({value: node[prop]["@value"], lang: node[prop]["@language"]});
            } else if (node[prop]["@type"]) {
              v.push({value: node[prop]["@value"], type: resolve(node[prop]["@type"], graph)});
            } else if (node[prop]["@id"]) {
              if (!res.$out[shortForm(prop)]) {
                res.$out[shortForm(prop)] = [];
              }
              res.$out[shortForm(prop)].push(node[prop]["@id"]);

              if (!graph.tempIn[node[prop]["@id"]]) {
                graph.tempIn[node[prop]["@id"]] = {};
              }
              if (!graph.tempIn[node[prop]["@id"]][shortForm(prop)]) {
                graph.tempIn[node[prop]["@id"]][shortForm(prop)] = [];
              }
              graph.tempIn[node[prop]["@id"]][shortForm(prop)].push(node["@id"]);

              v = undefined; // flag that property is not a literal
            } else {
              throw new Error("cannot parse property: " + JSON.stringify(node[prop]));
            }
          }
          if (v) {
            // store literal on node
            res[shortForm(prop)] = v;
          }
      }
    }
    graph.nodes[node["@id"]] = res;
  };

  Node.prototype.get = function(property) {
    if (this.graph.nodes[this.id][property]) {
      var prop = this.graph.nodes[this.id][property][0];
      if ( prop.lang) {
        return {
          value: prop.value,
          lang: prop.lang,
          type: "http://www.w3.org/2000/01/rdf-schema#langString"
        };
      }
      return {
        value: prop.value,
        lang: prop.lang,
        type: prop.type || "http://www.w3.org/2001/XMLSchema#string"
      };
    }
    throw new Error("property not defined for resource: " + property);
  };

  Node.prototype.out = function(property) {
    if (this.graph.nodes[this.id].$out[property]) {
      return new Node(this.graph.nodes[this.id].$out[property][0], this.graph);
    }
    throw new Error("outgoing relation not defined for resource: " + property);
  };

  Node.prototype.in = function(property) {
    if (this.graph.nodes[this.id].$in[property]) {
      return new Node(this.graph.nodes[this.id].$in[property][0], this.graph);
    }
    throw new Error("incoming relation not defined for resource: " + property);
  };

  Node.prototype.outAll = function(property) {
    if (this.graph.nodes[this.id].$out[property]) {
      var res = [];
      for (var i = 0; i < this.graph.nodes[this.id].$out[property].length; i++) {
        res.push(new Node(this.graph.nodes[this.id].$out[property][i], this.graph));
      }
      return res;
    }
    return [];
  };

  Node.prototype.inAll = function(property) {
    if (this.graph.nodes[this.id].$in[property]) {
      var res = [];
      for (var i = 0; i < this.graph.nodes[this.id].$in[property].length; i++) {
        res.push(new Node(this.graph.nodes[this.id].$in[property][i], this.graph));
      }
      return res;
    }
    return [];
  };

  Node.prototype.getAll = function(property) {
    if (!this.graph.nodes[this.id][property]) {
      return [];
    }
    return this.graph.nodes[this.id][property].map(function(v) {
      return {
        value: v.value,
        lang: v.lang,
        type: v.lang ? "http://www.w3.org/2000/01/rdf-schema#langString" :
                       v.type || "http://www.w3.org/2001/XMLSchema#string"
      };
    });
  };

  Node.prototype.getCount = function(property) {
    if (this.graph.nodes[this.id][property]) {
      return this.graph.nodes[this.id][property].length;
    }
    return 0;
  };

  var Graph = function(graphs) {
    this.nodes = {};
    this.tempIn = {};

    for (var i = 0; i < graphs.length; i++) {
      var g = graphs[i];
      this.context = {};

      if (typeof(g["@context"]) == "string") {
        this.context[""] = g["@context"];
      } else {
        this.context = g["@context"];
      }

      if (!g["@graph"]) {
        // single-node graph (or hierarchical graph with one top-node)
        parseNode(g, this);
      } else {
        // multi-node graph
        for (var j=0; j < g["@graph"].length; j++) {
          parseNode(g["@graph"][j], this);
        }
      }
    }

    for (var node in this.tempIn) {
      for (var prop in this.tempIn[node]) {
        if (!this.nodes[node]) {
          // node is only a object in graph, but we wan't it to be acessibly as subject as well.
          this.nodes[node] = {$in: {}, $out: {}};
        }
        this.nodes[node].$in[prop] = this.tempIn[node][prop];
      }
    }

    // cleanup
    this.tempIn = undefined;
  };


  Graph.prototype.byId = function(id) {
    if (this.nodes[id]) {
      return new Node(id, this);
    }
    throw new Error("resource not in graph: " + id);
  };

  Graph.prototype.all = function() {
    var res = [];
    for (var node in this.nodes) {
      res.push(new Node(node, this));
    }
    return res;
  };

  Graph.prototype.byType = function(type) {
    var res = [];
    for (var node in this.nodes) {
      if (this.nodes[node].$type === type) {
        res.push(new Node(node, this));
      }
    }
    return res;
  };

  return {
    parse: function (jsonld) {
      var graphs = [];
      for (var i = 0; i < arguments.length; i++) {
        graphs.push(arguments[i]);
      }
      return new Graph(graphs);
    }
  };
}));
