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
    return s.substr(s.indexOf(":")+1);
  };

  var Node = function(id, graph) {
    this.id = id;
    this.graph = graph;
  };

  var parseProperty = function(v) {
    // TODO remove duplication - maybe force to array first?
    var res = [];
    if (typeof(v) === "string") {
      // plain string literal
      res.push({value: v});
    } else if (Array.isArray(v)) {
      // multiple values of one property
      v.forEach(function(e) {
        if (typeof(e) === "string") {
          res.push({value: e});
        } else if (e["@language"]) {
          res.push({value: e["@value"], lang: e["@language"]});
        } else if (e["@type"]) {
          res.push({value: e["@value"], type: e["@type"]});
        } else if (e["@id"]) {
          res.push({$id: e["@id"]});
        } else {
          throw new Error("cannot parse property: " + JSON.stringify(e));
        }
      });
    } else {
      // typed literal or language-tagged literal
      if (v["@language"]) {
        res.push({value: v["@value"], lang: v["@language"]});
      } else if (v["@type"]) {
        res.push({value: v["@value"], type: v["@type"]});
      } else if (v["@id"]) {
        res.push({$id: v["@id"]});
      } else {
        throw new Error("cannot parse property: " + JSON.stringify(v));
      }

    }
    return res;
  };

  var parseNode = function(node, graph) {
    var res = {};
    for (var prop in node) {
      switch (prop) {
        case "@id":
        case "@context":
          break;
        case "@type":
          res.$type = node[prop];
          break;
        default:
          var v = parseProperty(node[prop]);
          for (var j=0; j<v.length; j++ ) {
            if (v[j].type) {
              graph.types[shortForm(prop)] = resolve(v[j].type, graph);
              delete v[j].type;
            }
          }
          res[shortForm(prop)] = v;
      }
    }
    graph.nodes[node["@id"]] = res;
  };

  Node.prototype.get = function(property) {
    if (this.graph.nodes[this.id][property]) {
      var prop = this.graph.nodes[this.id][property][0];
      if (prop.$id) {
        return new Node(prop.$id, this.graph);
      }
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
        type: this.graph.types[property] || "http://www.w3.org/2001/XMLSchema#string"
      };
    }
    throw new Error("property not defined for resource: " + property);
  };

  Node.prototype.getAll = function(property) {
    // TODO handle not only literals, but also resources
    if (!this.graph.nodes[this.id][property]) {
      return [];
    }
    var graph = this.graph;
    return this.graph.nodes[this.id][property].map(function(v) {
      return {
        value: v.value,
        lang: v.lang,
        type: v.lang ? "http://www.w3.org/2000/01/rdf-schema#langString" :
                       graph.types[property] || "http://www.w3.org/2001/XMLSchema#string"
      };
    });
  };

  Node.prototype.getCount = function(property) {
    if (this.graph.nodes[this.id][property]) {
      return this.graph.nodes[this.id][property].length;
    }
    return 0;
  };

  var Graph = function(jsonld) {
    /*
    this.nodes = [] {"prop": {val}, "prop2": {val}}
    this.ids = {"http://..": n} // n = index in this.nodes
    this.relations = {"1": {"rel": [ids]}, "2"} etc
    */
    this.nodes = {};
    this.types = {};
    this.context = {};

    if (typeof(jsonld["@context"]) == "string") {
      this.context[""] = jsonld["@context"];
    } else {
      this.context = jsonld["@context"];
    }

    if (!jsonld["@graph"]) {
      // single-node graph (or hierarchical graph with one top-node)
      parseNode(jsonld, this);
    } else {
      // multi-node graph
      for (var i=0; i < jsonld["@graph"].length; i++) {
        parseNode(jsonld["@graph"][i], this);
      }
    }
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
      return new Graph(jsonld);
    }
  };
}));
