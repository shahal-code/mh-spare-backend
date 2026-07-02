import User from "../../models/userModel.js";
import Address from "../../models/addressModel.js";

/**
 * Get all addresses for a user.
 */
export const getAddressesByUserId = async (userId) => {
    return await Address.find({ user_id: userId }).sort({ createdAt: -1 });
};

/**
 * Get address by ID.
 */
export const getAddressById = async (id) => {
    return await Address.findById(id);
};

/**
 * Create a new address.
 */
export const addAddress = async (userId, addressData) => {
    const addressCount = await Address.countDocuments({ user_id: userId });
    const isDefault = addressData.is_default === 'true' || addressData.is_default === true || addressData.is_default === 'on' || addressCount === 0;

    if (isDefault) {
        await Address.updateMany({ user_id: userId }, { is_default: false });
    }

    const newAddress = new Address({
        user_id: userId,
        ...addressData,
        is_default: isDefault
    });
    return await newAddress.save();
};

/**
 * Update an existing address.
 */
export const updateAddress = async (id, userId, addressData) => {
    const isDefault = addressData.is_default === 'true' || addressData.is_default === true || addressData.is_default === 'on';

    if (isDefault) {
        await Address.updateMany({ user_id: userId }, { is_default: false });
    }

    return await Address.findByIdAndUpdate(id, { ...addressData, is_default: isDefault }, { returnDocument: 'after' });
};

/**
 * Delete an address.
 */
export const deleteAddress = async (id) => {
    return await Address.findByIdAndDelete(id);
};

/**
 * Set an address as default for a user.
 */
export const setDefaultAddress = async (userId, addressId) => {
    // Set all addresses for this user to not default
    await Address.updateMany({ user_id: userId }, { is_default: false });
    // Set the specified address to default
    return await Address.findByIdAndUpdate(addressId, { is_default: true }, { returnDocument: 'after' });
};
