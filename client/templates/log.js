Template.log.helpers({
    log: function () {
        return moment(this).format('hh:mm:ss a, MMMM Do');
    },
});