/**
 * Created by Alex Bol on 3/31/2017.
 */
'use strict';

let NumberInterval = require('./classes/interval');

let {RB_TREE_COLOR_RED, RB_TREE_COLOR_BLACK} = require('./utils/constants');

module.exports = function(traits) {
    let RedBlackTree = require('flatten-red-black-tree')(traits);

    let Node = require('./classes/node')(traits);

    let nil_node = new Node();

    let IntervalTree = class IntervalTree  {
        constructor(props) {
            this.root = null;
        }

        get size() {
            let count = 0;
            this.tree_walk( this.root, () => count++ );
            return count;
        }

        get keys() {
            let res = [];
            this.tree_walk( this.root, (node) => res.push( node.item.key.output()) );
            return res;
        }

        get isEmpty() {
            return (this.root == null || this.root == nil_node);
        }

        insert(key, value=key) {
            if (key === undefined) return;
            let insert_node = new Node(key, value, nil_node, nil_node, null, RB_TREE_COLOR_RED);
            this.tree_insert(insert_node);
            this.recalc_max(insert_node);
            return insert_node;
        }

        find(key, value) {
            let search_node = new Node(key, value);
            let found_node = this.tree_search(this.root, search_node);
            return found_node ? found_node.item.value : undefined;
        }

        remove(key, value) {
            let search_node = new Node(key, value);
            let delete_node = this.tree_search(this.root, search_node);
            if (delete_node) {
                this.tree_delete(delete_node);
            }
        }

        search_interval(key, value) {
            var search_node = new Node(key, value);
            var resp_nodes = [];
            this.tree_search_interval(this.root, search_node, resp_nodes);
            let resp = [];
            resp_nodes.forEach( (node) => {
                if (node.item.value) {         // if there are values, return only values
                    resp.push(node.item.value);
                }
                else {                         // otherwise, return keys
                    resp.push(node.item.key.output());
                }
            }, []);
            return resp;
        }

        forEach(visitor) {
            this.tree_walk( this.root, (node) => visitor(node.item.key, node.item.value) );
        };

        recalc_max(node) {
            var node_current = node;
            while(node_current.parent != null) {
                node_current.parent.update_max();
                node_current = node_current.parent;
            }
        }

        tree_insert(insert_node) {
            var current_node = this.root;
            var parent_node = null;

            if (this.root == null || this.root == nil_node) {
                this.root = insert_node;
            }
            else {
                while (current_node != nil_node) {
                    parent_node = current_node;
                    if (insert_node.less_than(current_node)) {
                        current_node = current_node.left;
                    }
                    else {
                        current_node = current_node.right;
                    }
                }

                insert_node.parent = parent_node;

                if (insert_node.less_than(parent_node)) {
                    parent_node.left = insert_node;
                }
                else {
                    parent_node.right = insert_node;
                }
            }

            this.insert_fixup(insert_node);
        }

// After insertion insert_node may have red-colored parent, and this is a single possible violation
// Go upwords to the root and re-color until violation will be resolved
        insert_fixup(insert_node) {
            let current_node;
            let uncle_node;

            current_node = insert_node;
            while (current_node != this.root && current_node.parent.color == RB_TREE_COLOR_RED) {
                if (current_node.parent == current_node.parent.parent.left) {   // parent is left child of grandfather
                    uncle_node = current_node.parent.parent.right;              // right brother of parent
                    if (uncle_node.color == RB_TREE_COLOR_RED) {             // Case 1. Uncle is red
                        // re-color father and uncle into black
                        current_node.parent.color = RB_TREE_COLOR_BLACK;
                        uncle_node.color = RB_TREE_COLOR_BLACK;
                        current_node.parent.parent.color = RB_TREE_COLOR_RED;
                        current_node = current_node.parent.parent;
                    }
                    else {                                                    // Case 2 & 3. Uncle is black
                        if (current_node == current_node.parent.right) {     // Case 2. Current if right child
                            // This case is transformed into Case 3.
                            current_node = current_node.parent;
                            this.rotate_left(current_node);
                        }
                        current_node.parent.color = RB_TREE_COLOR_BLACK;    // Case 3. Current is left child.
                        // Re-color father and grandfather, rotate grandfather right
                        current_node.parent.parent.color = RB_TREE_COLOR_RED;
                        this.rotate_right(current_node.parent.parent);
                    }
                }
                else {                                                         // parent is right child of grandfather
                    uncle_node = current_node.parent.parent.left;              // left brother of parent
                    if (uncle_node.color == RB_TREE_COLOR_RED) {             // Case 4. Uncle is red
                        // re-color father and uncle into black
                        current_node.parent.color = RB_TREE_COLOR_BLACK;
                        uncle_node.color = RB_TREE_COLOR_BLACK;
                        current_node.parent.parent.color = RB_TREE_COLOR_RED;
                        current_node = current_node.parent.parent;
                    }
                    else {
                        if (current_node == current_node.parent.left) {             // Case 5. Current is left child
                            // Transform into case 6
                            current_node = current_node.parent;
                            this.rotate_right(current_node);
                        }
                        current_node.parent.color = RB_TREE_COLOR_BLACK;    // Case 6. Current is right child.
                        // Re-color father and grandfather, rotate grandfather left
                        current_node.parent.parent.color = RB_TREE_COLOR_RED;
                        this.rotate_left(current_node.parent.parent);
                    }
                }
            }

            this.root.color = RB_TREE_COLOR_BLACK;
        }

        tree_delete(delete_node) {
            var cut_node;   // node to be cut - either delete_node or successor_node  ("y" from 14.4)
            var fix_node;   // node to fix rb tree property   ("x" from 14.4)

            if (delete_node.left == nil_node || delete_node.right == nil_node) {  // delete_node has less then 2 children
                cut_node = delete_node;
            }
            else {                                                    // delete_node has 2 children
                cut_node = this.tree_successor(delete_node);
            }

            // fix_node if single child of cut_node
            if (cut_node.left != nil_node) {
                fix_node = cut_node.left;
            }
            else {
                fix_node = cut_node.right;
            }

            // remove cut_node from parent
            if (fix_node != nil_node) {
                fix_node.parent = cut_node.parent;
            }

            if (cut_node == this.root) {
                this.root = fix_node;
            }
            else {
                if (cut_node == cut_node.parent.left) {
                    cut_node.parent.left = fix_node;
                }
                else {
                    cut_node.parent.right = fix_node;
                }
                cut_node.parent.update_max();        // update max property of the parent
            }

            this.recalc_max(fix_node);              // update max property upward from fix_node to root

            // COPY DATA !!!
            // Delete_node becomes cut_node, it means that we cannot hold reference
            // to node in outer structure and we will have to delete by key, additional search need
            if (cut_node != delete_node) {
                delete_node.copy_data(cut_node);
                delete_node.update_max();           // update max property of the cut node at the new place
                this.recalc_max(delete_node);       // update max property upward from delete_node to root
            }

            if (fix_node != nil_node && cut_node.color == Flatten.RedBlackTree.RB_TREE_COLOR_BLACK) {
                this.delete_fixup(fix_node);
            }
        }

        delete_fixup(fix_node) {
            let current_node = fix_node;
            let brother_node;

            while (current_node != this.root && current_node.parent != null && current_node.color == RB_TREE_COLOR_BLACK) {
                if (current_node == current_node.parent.left) {          // fix node is left child
                    brother_node = current_node.parent.right;
                    if (brother_node.color == RB_TREE_COLOR_RED) {   // Case 1. Brother is red
                        brother_node.color = RB_TREE_COLOR_BLACK;         // re-color brother
                        current_node.parent.color = RB_TREE_COLOR_RED;    // re-color father
                        this.rotate_left(current_node.parent);
                        brother_node = current_node.parent.right;                      // update brother
                    }
                    // Derive to cases 2..4: brother is black
                    if (brother_node.left.color == RB_TREE_COLOR_BLACK &&
                        brother_node.right.color == RB_TREE_COLOR_BLACK ) {  // case 2: both nephews black
                        brother_node.color = RB_TREE_COLOR_RED;              // re-color brother
                        current_node = current_node.parent;                  // continue iteration
                    }
                    else {
                        if (brother_node.right.color == RB_TREE_COLOR_BLACK) {   // case 3: left nephew red, right nephew black
                            brother_node.color = RB_TREE_COLOR_RED;          // re-color brother
                            brother_node.left.color = RB_TREE_COLOR_BLACK;   // re-color nephew
                            this.rotate_right(brother_node);
                            brother_node = current_node.parent.right;                     // update brother
                            // Derive to case 4: left nephew black, right nephew red
                        }
                        // case 4: left nephew black, right nephew red
                        brother_node.color = current_node.parent.color;
                        current_node.parent.color = RB_TREE_COLOR_BLACK;
                        brother_node.right.color = RB_TREE_COLOR_BLACK;
                        this.rotate_left(current_node.parent);
                        current_node = this.root;                         // exit from loop
                    }
                }
                else {                                             // fix node is right child
                    brother_node = current_node.parent.left;
                    if (brother_node.color == RB_TREE_COLOR_RED) {   // Case 1. Brother is red
                        brother_node.color = RB_TREE_COLOR_BLACK;         // re-color brother
                        current_node.parent.color = RB_TREE_COLOR_RED;    // re-color father
                        this.rotate_right(current_node.parent);
                        brother_node = current_node.parent.left;                        // update brother
                    }
                    // Go to cases 2..4
                    if (brother_node.left.color == RB_TREE_COLOR_BLACK &&
                        brother_node.right.color == RB_TREE_COLOR_BLACK) {   // case 2
                        brother_node.color = RB_TREE_COLOR_RED;             // re-color brother
                        current_node = current_node.parent;                              // continue iteration
                    }
                    else {
                        if (brother_node.left.color == RB_TREE_COLOR_BLACK) {  // case 3: right nephew red, left nephew black
                            brother_node.color = RB_TREE_COLOR_RED;            // re-color brother
                            brother_node.right.color = RB_TREE_COLOR_BLACK;    // re-color nephew
                            this.rotate_left(brother_node);
                            brother_node = current_node.parent.left;                        // update brother
                            // Derive to case 4: right nephew black, left nephew red
                        }
                        // case 4: right nephew black, left nephew red
                        brother_node.color = current_node.parent.color;
                        current_node.parent.color = RB_TREE_COLOR_BLACK;
                        brother_node.left.color = RB_TREE_COLOR_BLACK;
                        this.rotate_right(current_node.parent);
                        current_node = this.root;                               // force exit from loop
                    }
                }
            }

            current_node.color = RB_TREE_COLOR_BLACK;
        }

        tree_search(node, search_node) {
            if (node == null || node == nil_node)
                return undefined;

            if (search_node.equal_to(node)) {
                return node;
            }
            if (search_node.less_than(node)) {
                return this.tree_search(node.left, search_node);
            }
            else {
                return this.tree_search(node.right, search_node);
            }
        }

        // Original search_interval method; container res support push() insertion
        // Search all intervals intersecting given one
        tree_search_interval(node, search_node, res) {
            if (node != null && node != nil_node) {
                // if (node->left != nil_node && node->left->max >= low) {
                if (node.left != nil_node && !node.not_intersect_left_subtree(search_node)) {
                    this.tree_search_interval(node.left, search_node, res);
                }
                // if (low <= node->high && node->low <= high) {
                if (node.intersect(search_node)) {
                    res.push(node);
                }
                // if (node->right != nil_node && node->low <= high) {
                if (node.right != nil_node &&  !node.not_intersect_right_subtree(search_node)) {
                    this.tree_search_interval(node.right, search_node, res);
                }
            }
        }

        local_minimum(node) {
            let node_min = node;
            while (node_min.left != null && node_min.left != nil_node) {
                node_min = node_min.left;
            }
            return node_min;
        }

        // not in use
        local_maximum(node) {
            var node_max = node;
            while (node_max.right != null && node_max.right != nil_node) {
                node_max = node_max.right;
            }
            return node_max;
        }

        tree_successor(node) {
            let node_successor;
            let current_node;
            let parent_node;

            if (node.right != nil_node) {
                node_successor = this.local_minimum(node.right);
            }
            else {
                current_node = node;
                parent_node = node.parent;
                while (parent_node != null && parent_node.right == current_node) {
                    current_node = parent_node;
                    parent_node = parent_node.parent;
                }
                node_successor = parent_node;
            }
            return node_successor;
        }

        //           |            right-rotate(T,y)       |
        //           y            ---------------.       x
        //          / \                                  / \
        //         x   c          left-rotate(T,x)      a   y
        //        / \             <---------------         / \
        //       a   b                                    b   c

        rotate_left(x) {
            let y = x.right;

            x.right = y.left;           // b goes to x.right

            if (y.left != nil_node) {
                y.left.parent = x;     // x becomes parent of b
            }
            y.parent = x.parent;       // move parent

            if (x == this.root) {
                this.root = y;           // y becomes root
            }
            else {                        // y becomes child of x.parent
                if (x == x.parent.left) {
                    x.parent.left = y;
                }
                else {
                    x.parent.right = y;
                }
            }
            y.left = x;                 // x becomes left child of y
            x.parent = y;               // and y becomes parent of x

            if (x != null && x != nil_node) {
                x.update_max();
            }

            y = x.parent;
            if (y != null && y != nil_node) {
                y.update_max();
            }
        }

        rotate_right(y) {
            let x = y.left;

            y.left = x.right;           // b goes to y.left

            if (x.right != nil_node) {
                x.right.parent = y;        // y becomes parent of b
            }
            x.parent = y.parent;          // move parent

            if (y == this.root) {        // x becomes root
                this.root = x;
            }
            else {                        // y becomes child of x.parent
                if (y == y.parent.left) {
                    y.parent.left = x;
                }
                else {
                    y.parent.right = x;
                }
            }
            x.right = y;                 // y becomes right child of x
            y.parent = x;               // and x becomes parent of y

            if (y != null && y != nil_node) {
                y.update_max();
            }

            x = y.parent;
            if (x != null && x != nil_node) {
                x.update_max();
            }
        }

        tree_walk(node, action) {
            if (node != null && node != nil_node) {
                this.tree_walk(node.left, action);
                // arr.push(node.toArray());
                action(node);
                this.tree_walk(node.right, action);
            }
        }

        /* Return true if all red nodes have exactly two black child nodes */
        testRedBlackProperty() {
            var res = true;
            this.tree_walk(this.root, function(node) {
                if (node.color == RB_TREE_COLOR_RED) {
                    if (!(node.left.color == RB_TREE_COLOR_BLACK && node.right.color == RB_TREE_COLOR_BLACK)) {
                        res = false;
                    }
                }
            });
            return res;
        }

    };

    return IntervalTree;
};