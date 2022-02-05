// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Collection of functions related to array types.
 */
library Arrays {
    /**
     * @dev Remove first matched element from array
     *
     */
    function removeOne(address[] storage array, address value) internal returns (bool) {
        uint256 i;
        uint256 length = array.length;
        while (i < length) {
            if (array[i] == value) {
                array[i] = array[length - 1];
                array.pop();
                return true;
            }
            unchecked { i++; }
        }
        return false;
    }
}