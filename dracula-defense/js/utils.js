const MathUtils = {
    distance(p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    },
    angle(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    },
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },
    circleIntersect(c1, c2) {
        return this.distance(c1, c2) <= c1.radius + c2.radius;
    },
    rectIntersect(r1, r2) {
        return !(r2.x > r1.x + r1.width || 
                 r2.x + r2.width < r1.x || 
                 r2.y > r1.y + r1.height ||
                 r2.y + r2.height < r1.y);
    },
    circleRectIntersect(circle, rect) {
        let testX = circle.x;
        let testY = circle.y;

        if (circle.x < rect.x) testX = rect.x;
        else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;

        if (circle.y < rect.y) testY = rect.y;
        else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;

        let distX = circle.x - testX;
        let distY = circle.y - testY;
        let distance = Math.sqrt((distX*distX) + (distY*distY));

        return distance <= circle.radius;
    }
};
