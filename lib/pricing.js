export function getCurrentPrice(price, pricingRules) {
    const hour = new Date().getHours();
    const activeRule = pricingRules.find((rule) => hour >= rule.activeFromHour && hour < rule.activeToHour);
    if (!activeRule) {
        return { currentPrice: price, activeDiscountLabel: undefined };
    }
    const discounted = Number((price * (1 - activeRule.percentageOff / 100)).toFixed(2));
    return { currentPrice: discounted, activeDiscountLabel: activeRule.label };
}
export function toMenuItemView(item) {
    const { currentPrice, activeDiscountLabel } = getCurrentPrice(item.price, item.pricingRules ?? []);
    return {
        _id: item._id.toString(),
        restaurantId: item.restaurantId.toString(),
        category: item.category,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        imagePublicId: item.imagePublicId,
        status: item.status,
        pricingRules: item.pricingRules ?? [],
        currentPrice,
        activeDiscountLabel,
        isAvailable: item.status === "in_stock",
        tags: item.tags ?? []
    };
}
